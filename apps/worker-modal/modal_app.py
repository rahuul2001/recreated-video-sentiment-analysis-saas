import modal

app = modal.App("video-intelligence-worker")

# This runs in the cloud
@app.function()
def ping(name: str = "world") -> str:
    print(f"Remote log: Received request for {name}") # This goes to the dashboard logs
    return f"hello, {name}"

# This runs on your machine
@app.local_entrypoint()
def main(name: str = "Rahul"):
    print("Calling remote function...")
    # .remote() triggers the execution in the cloud
    response = ping.remote(name)
    print(f"👉 Result: {response}")