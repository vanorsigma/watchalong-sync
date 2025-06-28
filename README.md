# Watchalong Sync

Watchalongs typically feature copyrighted content that cannot be shown on stream (e.g. on Twitch / YouTube).
As such, it's sometimes useful to sync watchalong times with the streamer, typically with an indicator on stream.
This repository aims to make the synchronization automatic for all involved parties.

An additional requirement is for the tool to be serverless; this means no WebRTC (which can lead to IP address leaks) and WebSocket servers (which requires a dedicated service).
