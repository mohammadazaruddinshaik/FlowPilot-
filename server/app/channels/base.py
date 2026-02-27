class BaseChannel:

    def __init__(self, integration):
        self.integration = integration

    def send(self, recipient: str, message: str):
        raise NotImplementedError("Channel must implement send()")