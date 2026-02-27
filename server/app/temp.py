from twilio.rest import Client

# 🔥 Replace with your real credentials
account_sid = ""
auth_token = "YOUR_AUTH_TOKEN"

client = Client(account_sid, auth_token)

message = client.messages.create(
    body="Test message from backend",
    from_="whatsapp:+14155238886",  # Twilio sandbox number
    to="whatsapp:+919100312008"
)

print("SID:", message.sid)
print("Status:", message.status)