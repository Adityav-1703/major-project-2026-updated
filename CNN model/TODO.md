# HerbChain Project TODO

Approved plan to fix certificate.py + next steps for full run.

## Current Progress
✅ Venv created (.venv)

## Fix certificate.py (Step 1/6)
- [ ] Edit files/certificate.py:
  - Windows fonts (Arial)
  - Fix `rounded_rectangle` → custom rounded polygon or rectangle
  - Add `if __name__ == "__main__":` demo
- [ ] Install cert deps: `.venv\\Scripts\\pip.exe install Pillow qrcode[pil] cairosvg`
- [ ] Test: `python files/certificate.py`

## Full Project
- [ ] Add `data/herbs/species/*.jpg` (photos yourself)
- [ ] Python 3.11/3.12 env for TF
- [ ] `python files/train_cnn.py`
- [ ] Deploy HerbChain.sol (optional)
- [ ] `.venv\\Scripts\\python.exe files/main.py` → http://localhost:8000/docs

Updated after each step.

