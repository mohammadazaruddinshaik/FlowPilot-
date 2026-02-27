# app/channels/twilio_whatsapp.py

from twilio.rest import Client
from app.channels.base import BaseChannel
from app.core.crypto import decrypt_credentials


class TwilioWhatsAppChannel(BaseChannel):

    def send(self, recipient: str, message: str):

        try:
            credentials = decrypt_credentials(self.integration.api_key_encrypted)

            account_sid = credentials["account_sid"]
            auth_token = credentials["auth_token"]
            sender = self.integration.sender_identifier

            if not recipient.startswith("+"):
                return {
                    "success": False,
                    "provider_message_id": None,
                    "response_message": "Recipient must be E.164 format (+91xxxx...)"
                }

            client = Client(account_sid, auth_token)

            msg = client.messages.create(
                body=message,
                from_=f"whatsapp:{sender}",
                to=f"whatsapp:{recipient}"
            )

            return {
                "success": True,
                "provider_message_id": msg.sid,
                "response_message": msg.status
            }

        except Exception as e:
            return {
                "success": False,
                "provider_message_id": None,
                "response_message": str(e)
            }