import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: string;
  sessionRooms: Set<string>;
}

@WebSocketGateway({
  namespace: '/telemedicine',
  cors: { origin: '*', credentials: true },
})
export class TelemedicineGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelemedicineGateway.name);
  private userSockets = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('Telemedicine WebSocket gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) throw new Error('No token provided');

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      client.userId = payload.sub;
      client.userRole = payload.role;
      client.sessionRooms = new Set();
      this.userSockets.set(payload.sub, client.id);

      this.logger.log(`Client connected: ${client.userId} (${client.userRole})`);
    } catch {
      this.logger.warn(`Unauthorized WS connection from ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.userSockets.delete(client.userId);
      this.logger.log(`Client disconnected: ${client.userId}`);
    }
  }

  // ─── Join / Leave ─────────────────────────────────────────────────────────

  @SubscribeMessage('join-session')
  handleJoinSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session:${data.sessionId}`;
    client.join(room);
    client.sessionRooms.add(room);

    this.server.to(room).emit('participant-joined', {
      userId: client.userId,
      role: client.userRole,
      timestamp: new Date(),
    });

    this.logger.log(`${client.userId} joined room ${room}`);
    return { event: 'joined', room };
  }

  @SubscribeMessage('leave-session')
  handleLeaveSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session:${data.sessionId}`;
    client.leave(room);
    client.sessionRooms.delete(room);

    this.server.to(room).emit('participant-left', {
      userId: client.userId,
      role: client.userRole,
      timestamp: new Date(),
    });
  }

  // ─── Signaling ────────────────────────────────────────────────────────────

  @SubscribeMessage('user-ready')
  handleUserReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; uid: number },
  ) {
    const room = `session:${data.sessionId}`;
    client.to(room).emit('peer-ready', {
      userId: client.userId,
      role: client.userRole,
      uid: data.uid,
    });
  }

  @SubscribeMessage('user-left-call')
  handleUserLeftCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session:${data.sessionId}`;
    client.to(room).emit('peer-left-call', {
      userId: client.userId,
      role: client.userRole,
    });
  }

  @SubscribeMessage('media-state')
  handleMediaState(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; audioMuted: boolean; videoMuted: boolean },
  ) {
    const room = `session:${data.sessionId}`;
    client.to(room).emit('peer-media-state', {
      userId: client.userId,
      audioMuted: data.audioMuted,
      videoMuted: data.videoMuted,
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; isTyping: boolean },
  ) {
    const room = `session:${data.sessionId}`;
    client.to(room).emit('peer-typing', {
      userId: client.userId,
      role: client.userRole,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('vitals-update')
  handleVitalsUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; vitals: Record<string, any> },
  ) {
    if (client.userRole !== 'doctor') {
      throw new WsException('Only doctors can broadcast vitals updates');
    }
    const room = `session:${data.sessionId}`;
    this.server.to(room).emit('vitals-updated', {
      vitals: data.vitals,
      updatedBy: client.userId,
      timestamp: new Date(),
    });
  }

  // ─── Event Listeners ──────────────────────────────────────────────────────

  @OnEvent('telemedicine.session.initiated')
  broadcastSessionInitiated({ session }: any) {
    this.emitToUser(session.doctorId, 'session-initiated', session);
    this.emitToUser(session.patientId, 'session-initiated', session);
  }

  @OnEvent('telemedicine.session.started')
  broadcastSessionStarted({ session }: any) {
    const room = `session:${session.id}`;
    this.server.to(room).emit('session-started', {
      sessionId: session.id,
      startedAt: session.startedAt,
    });
  }

  @OnEvent('telemedicine.session.completed')
  broadcastSessionCompleted({ session }: any) {
    const room = `session:${session.id}`;
    this.server.to(room).emit('session-ended', {
      sessionId: session.id,
      endedAt: session.endedAt,
      durationSeconds: session.durationSeconds,
    });
  }

  @OnEvent('telemedicine.session.cancelled')
  broadcastSessionCancelled({ session }: any) {
    const room = `session:${session.id}`;
    this.server.to(room).emit('session-cancelled', {
      sessionId: session.id,
      reason: session.cancellationReason,
    });
  }

  @OnEvent('telemedicine.chat.message')
  broadcastChatMessage({ message }: any) {
    const room = `session:${message.sessionId}`;
    this.server.to(room).emit('new-message', message);
  }

  @OnEvent('telemedicine.prescription.created')
  broadcastPrescriptionCreated({ prescription, sessionRef }: any) {
    this.emitToUser(prescription.patientId, 'prescription-ready', {
      prescriptionId: prescription.id,
      prescriptionRef: prescription.prescriptionRef,
      sessionRef,
    });
  }

  @OnEvent('telemedicine.followup.scheduled')
  broadcastFollowUpScheduled({ session, followUpDate }: any) {
    this.emitToUser(session.patientId, 'followup-scheduled', {
      sessionRef: session.sessionRef,
      followUpDate,
    });
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  private emitToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  broadcastToSession(sessionId: string, event: string, data: any) {
    this.server.to(`session:${sessionId}`).emit(event, data);
  }
}