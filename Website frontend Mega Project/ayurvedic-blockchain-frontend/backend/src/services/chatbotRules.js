import { contactRefusalReply, isContactRequest } from './chatbotPolicy.js'
import { DEFAULT_TOPIC_REPLY, matchChatTopic } from './chatbotMatch.js'

export function getRuleBasedReply(message) {
  if (isContactRequest(message)) return contactRefusalReply()
  return matchChatTopic(message).reply
}

export { DEFAULT_TOPIC_REPLY }
