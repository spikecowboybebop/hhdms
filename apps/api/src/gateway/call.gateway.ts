import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // This lets your Next.js web application talk to this server safely
  },
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Track active call pairings: socketId → paired socketId
  private activeCalls: Map<string, string> = new Map();

  // Track ringing (unanswered) calls so early disconnects dismiss agent popups
  private pendingCalls: Set<string> = new Set();

  // This fires automatically when the Android app or Web app logs into the socket channel
  handleConnection(client: Socket) {
    console.log(`⚡ Device connected to gateway socket id: ${client.id}`);
  }

  // This fires automatically when a device closes the app or leaves the page
  handleDisconnect(client: Socket) {
    console.log(`🔌 Device disconnected: ${client.id}`);

    // Case 1: Paired call — notify the peer
    const pairedId = this.activeCalls.get(client.id);
    if (pairedId) {
      console.log(
        `📞 [END] ${client.id} disconnected — notifying peer ${pairedId}`,
      );
      this.server
        .to(pairedId)
        .emit('call-ended', { reason: 'peer-disconnected' });
      this.activeCalls.delete(pairedId);
      this.activeCalls.delete(client.id);
    }

    // Case 2: Ringing but unanswered — dismiss all agent popups
    if (this.pendingCalls.has(client.id)) {
      console.log(
        `📞 [CANCEL] ${client.id} disconnected while ringing — dismissing agent popups`,
      );
      client.broadcast.emit('call-ended', { reason: 'patient-cancelled' });
      this.pendingCalls.delete(client.id);
    }
  }

  /**
   * ACTION 1: Patient taps "Start Voice Call" in Android App
   */
  @SubscribeMessage('call-center-dial')
  handleIncomingCall(
    @MessageBody() data: { patientEmail: string; sdpOffer: any },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(
      `📞 [DIAL] Patient ${data.patientEmail} is calling the agent help desk...`,
    );

    // Track this as a ringing call so early disconnects are handled
    this.pendingCalls.add(client.id);

    // Pass this call alert straight over to the Next.js Web Agent app
    this.server.emit('agent-incoming-call', {
      patientEmail: data.patientEmail,
      sdpOffer: data.sdpOffer,
      patientSocketId: client.id, // Save the phone's unique socket ID line!
    });
  }

  /**
   * ACTION 2: Web Agent clicks "Accept Call" in Next.js Browser Modal
   */
  @SubscribeMessage('agent-accept-call')
  handleAgentAcceptance(
    @MessageBody() data: { patientSocketId: string; sdpAnswer: any },
    @ConnectedSocket() client: Socket, // 👈 ADDED: Capture the agent's web socket session details
  ) {
    console.log(
      `🟢 [ANSWER] Agent [${client.id}] picked up the call for patient line: ${data.patientSocketId}`,
    );

    // Move from ringing to active pairing
    this.pendingCalls.delete(data.patientSocketId);

    // Register the call pair for clean disconnection handling
    this.activeCalls.set(data.patientSocketId, client.id);
    this.activeCalls.set(client.id, data.patientSocketId);

    // Route the agent's response payload back directly to the waiting phone
    this.server.to(data.patientSocketId).emit('call-routing-connected', {
      sdpAnswer: data.sdpAnswer,
      agentSocketId: client.id, // 🚀 FIXED: Vital fallback tracking property sent to Android!
    });
  }

  /**
   * ACTION 3: Exchanging connection pathways (ICE Candidates)
   */
  @SubscribeMessage('relay-ice-candidate')
  handleIceCandidate(
    @MessageBody() data: { targetSocketId: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data || !data.targetSocketId) {
      console.warn(
        `⚠️ Warning: Received candidate from [${client.id}] but missing targetSocketId.`,
      );
      return;
    }

    // Relay network structural paths straight across to the other party
    this.server.to(data.targetSocketId).emit('remote-ice-candidate', {
      candidate: data.candidate,
      from: client.id,
    });

    console.log(`🛰️  [ICE RELAY] ${client.id} ➡️  ${data.targetSocketId}`);
  }

  /**
   * ACTION 4: Either party hangs up intentionally
   */
  @SubscribeMessage('end-call')
  handleEndCall(
    @MessageBody() data: { targetSocketId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const pairedId = data?.targetSocketId || this.activeCalls.get(client.id);
    console.log(
      `📞 [END-CALL] ${client.id} is ending the call. Notifying peer: ${pairedId}`,
    );

    if (pairedId) {
      this.server.to(pairedId).emit('call-ended', { reason: 'peer-hung-up' });
      this.activeCalls.delete(pairedId);
    } else {
      // Patient hung up before agent answered — dismiss all agent popups
      console.log(
        `📞 [CANCEL] ${client.id} cancelled while ringing — dismissing agent popups`,
      );
      client.broadcast.emit('call-ended', { reason: 'patient-cancelled' });
    }

    this.pendingCalls.delete(client.id);
    this.activeCalls.delete(client.id);
  }
}
