// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * HerbChain Authentication Registry
 *
 * Stores herb authentication records immutably on-chain.
 * Each record links: image hash → CNN result → IPFS cert → owner
 *
 * Deploy on: Ethereum mainnet, Polygon, or a private chain (Ganache for dev)
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract HerbChain is AccessControl, Pausable, ReentrancyGuard {

    // ── Roles ──────────────────────────────────────────────────────────────
    bytes32 public constant AUTHENTICATOR_ROLE = keccak256("AUTHENTICATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE        = keccak256("AUDITOR_ROLE");

    // ── Structs ────────────────────────────────────────────────────────────
    enum PurityLevel { ADULTERATED, ACCEPTABLE, PURE }

    struct HerbRecord {
        string  certId;           // UUID from backend
        string  batchId;          // Supply chain batch
        string  species;          // Herb species name
        uint16  confidenceBps;    // Confidence in basis points (e.g. 9750 = 97.50%)
        uint16  purityScoreBps;   // Purity 0..10000 bps
        PurityLevel purityLevel;
        bool    authenticated;
        bytes32 imageHash;        // SHA-256 of the original image
        string  ipfsCid;          // IPFS CID of certificate card PNG
        address submittedBy;
        uint256 timestamp;
        bool    revoked;
        string  revocationReason;
    }

    // ── State ──────────────────────────────────────────────────────────────
    mapping(bytes32 => HerbRecord) private records;    // imageHash → record
    mapping(string  => bytes32)    private certIndex;  // certId    → imageHash
    mapping(string  => bytes32[])  private batchIndex; // batchId   → imageHashes[]
    bytes32[] private allHashes;

    uint256 public totalAuthenticated;
    uint256 public totalRejected;
    uint256 public totalRevoked;

    // ── Events ─────────────────────────────────────────────────────────────
    event RecordAdded(
        bytes32 indexed imageHash,
        string  certId,
        string  species,
        bool    authenticated,
        address submittedBy
    );
    event RecordRevoked(bytes32 indexed imageHash, string reason, address revokedBy);

    // ── Constructor ────────────────────────────────────────────────────────
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AUTHENTICATOR_ROLE, admin);
        _grantRole(AUDITOR_ROLE, admin);
    }

    // ── Write ──────────────────────────────────────────────────────────────

    /**
     * @notice Submit a new herb authentication record
     * @dev Only AUTHENTICATOR_ROLE. imageHash must be unique.
     */
    function addRecord(
        string  calldata certId,
        string  calldata batchId,
        string  calldata species,
        uint16           confidenceBps,
        uint16           purityScoreBps,
        PurityLevel      purityLevel,
        bool             authenticated,
        bytes32          imageHash,
        string  calldata ipfsCid
    )
        external
        whenNotPaused
        nonReentrant
        onlyRole(AUTHENTICATOR_ROLE)
    {
        require(records[imageHash].timestamp == 0, "HerbChain: duplicate image hash");
        require(confidenceBps <= 10000, "HerbChain: confidence out of range");
        require(purityScoreBps <= 10000, "HerbChain: purity out of range");
        require(bytes(certId).length > 0, "HerbChain: empty certId");

        records[imageHash] = HerbRecord({
            certId:           certId,
            batchId:          batchId,
            species:          species,
            confidenceBps:    confidenceBps,
            purityScoreBps:   purityScoreBps,
            purityLevel:      purityLevel,
            authenticated:    authenticated,
            imageHash:        imageHash,
            ipfsCid:          ipfsCid,
            submittedBy:      msg.sender,
            timestamp:        block.timestamp,
            revoked:          false,
            revocationReason: ""
        });

        certIndex[certId]    = imageHash;
        batchIndex[batchId].push(imageHash);
        allHashes.push(imageHash);

        if (authenticated) { totalAuthenticated++; } else { totalRejected++; }

        emit RecordAdded(imageHash, certId, species, authenticated, msg.sender);
    }

    /**
     * @notice Revoke a record (e.g. fraud discovered after issuance)
     */
    function revokeRecord(bytes32 imageHash, string calldata reason)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        HerbRecord storage r = records[imageHash];
        require(r.timestamp > 0, "HerbChain: record not found");
        require(!r.revoked,      "HerbChain: already revoked");

        r.revoked          = true;
        r.revocationReason = reason;
        totalRevoked++;

        emit RecordRevoked(imageHash, reason, msg.sender);
    }

    // ── Read ───────────────────────────────────────────────────────────────

    function getRecordByHash(bytes32 imageHash)
        external view returns (HerbRecord memory)
    {
        require(records[imageHash].timestamp > 0, "HerbChain: not found");
        return records[imageHash];
    }

    function getRecordByCertId(string calldata certId)
        external view returns (HerbRecord memory)
    {
        bytes32 h = certIndex[certId];
        require(h != bytes32(0), "HerbChain: cert not found");
        return records[h];
    }

    function getBatchRecords(string calldata batchId)
        external view returns (bytes32[] memory)
    {
        return batchIndex[batchId];
    }

    function isAuthentic(bytes32 imageHash)
        external view returns (bool authentic, bool revoked, string memory species)
    {
        HerbRecord storage r = records[imageHash];
        if (r.timestamp == 0) return (false, false, "");
        return (r.authenticated && !r.revoked, r.revoked, r.species);
    }

    function getTotalRecords() external view returns (uint256) {
        return allHashes.length;
    }

    // ── Admin ──────────────────────────────────────────────────────────────

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
