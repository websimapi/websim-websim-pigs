export class Network {
    constructor(game) {
        this.game = game;
        this.room = new WebsimSocket();
        this.peers = {};
        this.id = null;
    }

    async connect() {
        await this.room.initialize();
        this.id = this.room.clientId;

        // Get initial peers
        this.syncPeers();

        // Subscribe to updates
        this.room.subscribePresence((presence) => {
            this.handlePresenceUpdate(presence);
        });

        // Periodically clean up disconnected peers
        setInterval(() => this.cleanup(), 5000);

        console.log("Connected as", this.id);
        return this.room.peers[this.id];
    }

    syncPeers() {
        // room.peers is the source of truth for user info
        for (const [id, info] of Object.entries(this.room.peers)) {
            if (!this.peers[id]) {
                this.peers[id] = info;
                this.game.addPeer(id, info);
            }
        }
    }

    handlePresenceUpdate(presence) {
        // Sync peers list first (in case of new connections)
        this.syncPeers();

        for (const [id, data] of Object.entries(presence)) {
            if (id === this.id) continue; // Skip self
            this.game.updatePeer(id, data);
        }
    }

    updateMyPresence(data) {
        this.room.updatePresence(data);
    }

    cleanup() {
        // Check for disconnected peers
        const currentPeerIds = Object.keys(this.room.peers);
        const knownPeerIds = Object.keys(this.game.remotePlayers);

        for (const id of knownPeerIds) {
            if (!currentPeerIds.includes(id)) {
                this.game.removePeer(id);
                delete this.peers[id];
            }
        }
    }
}