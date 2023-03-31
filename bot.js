import sdk from 'matrix-js-sdk';
import config from './_config.json' assert { type: 'json' };
import olm from '@matrix-org/olm';

global.Olm = olm;

class MatrixChatBot {
  constructor() {
    this.client = sdk.createClient({
      baseUrl: config.homeserverUrl,
      userId: `@${config.username}:${config.userurl}`,
      deviceId: config.deviceId,
    });
  }

  async start() {
    await this.login();
    await this.client.initCrypto();
    await this.client.startClient();

    this.client.on('sync', (state) => {
      if (state === 'PREPARED') {
        this.enableEncryptionInAllJoinedRooms();
      }
    });

    this.client.on('Room.timeline', async (event, room, toStartOfTimeline) => {
      if (toStartOfTimeline) return;
        console.log(event)
      const eventType = event.getType();
      const sender = event.getSender();
      if (eventType !== 'm.room.message' && eventType !== 'm.room.encrypted') return;
      if (sender === this.client.getUserId()) return;

      if (eventType === 'm.room.encrypted') {
        const content = event.getWireContent();
        const senderKey = content.sender_key;
        const sessionId = content.session_id;

        const devices = this.client.getStoredDevicesForUser(sender);
        if (!devices) {
          console.warn('Cannot request room key: devices not found');
          return;
        }

        const deviceArray = Object.values(devices);
        const deviceId = deviceArray.find((device) => device.keys['curve25519:' + device.deviceId] === senderKey)?.deviceId;

        if (!deviceId) {
          console.warn('Cannot request room key: device not found');
          return;
        }

        const roomKeyRequestBody = {
          algorithm: content.algorithm,
          room_id: event.getRoomId(),
          sender_key: senderKey,
          session_id: sessionId,
        };

        const requestId = `${this.client.deviceId}:${senderKey}:${sessionId}`;

        const keyRequestContent = {
          action: 'request',
          body: roomKeyRequestBody,
          requesting_device_id: this.client.deviceId,
          request_id: requestId,
        };
        const key_request_event = {
          content: keyRequestContent,
          type: 'm.room_key_request',
          sender: sender,
        };

        console.log('Requesting room key...');
        await this.client.sendToDevice('m.room_key_request', key_request_event);
      } else {
        this.handleMessage(room, event.getContent().body);
      }
    });
  }

  async joinRoom(roomId) {
    try {
      await this.client.joinRoom(roomId);
      console.log(`Joined room: ${roomId}`);
    } catch (error) {
      console.error(`Failed to join room ${roomId}:`, error);
    }
  }

  async login() {
    const response = await this.client.loginWithPassword(config.username, config.password);
    this.client.setAccessToken(response.access_token);
  }

  async enableEncryptionInAllJoinedRooms() {
    const rooms = this.client.getRooms();
    for (const room of rooms) {
      const encryptionEvent = room.currentState.getStateEvents('m.room.encryption', '');
      if (!encryptionEvent) continue;

      const isEncrypted = encryptionEvent.getContent().algorithm === 'm.megolm.v1.aes-sha2';
      if (!isEncrypted) continue;

      const roomId = room.roomId;
      await this.client.setRoomEncryption(roomId, {
        algorithm: 'm.megolm.v1.aes-sha2',
        rotation_period_ms: 604800000, // 1 week
        rotation_period_msgs: 100,
      });
    }
  }

  async handleMessage(room, message) {
    // const response = `Hello! You said: ${message}`;
    // await this.client.sendTextMessage(room.roomId, response);
    console.log(message);
  }
}

export default MatrixChatBot;
