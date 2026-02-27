import smtplib
from email.message import EmailMessage

from app.channels.base import BaseChannel
from app.core.crypto import decrypt_credentials


class SMTPEmailChannel(BaseChannel):

    def send(self, recipient: str, message: str):

        try:
            credentials = decrypt_credentials(self.integration.api_key_encrypted)

            smtp_host = credentials["smtp_host"]
            smtp_port = credentials.get("smtp_port", 587)
            smtp_user = credentials["smtp_user"]
            smtp_pass = credentials["smtp_pass"]

            sender = self.integration.sender_identifier

            msg = EmailMessage()
            msg["From"] = sender
            msg["To"] = recipient
            msg["Subject"] = credentials.get("subject", "Notification")

            msg.set_content(message)

            # Optional HTML support
            if credentials.get("html_enabled"):
                msg.add_alternative(message, subtype="html")

            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
                server.starttls()

            with server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)

            return {
                "success": True,
                "provider_message_id": None,
                "response_message": "Email sent successfully"
            }

        except Exception as e:
            return {
                "success": False,
                "provider_message_id": None,
                "response_message": str(e)
            }