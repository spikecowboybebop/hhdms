import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateForPatient(userId: string) {
    const patient = await this.prisma.patients.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found.');

    const assignment = await this.prisma.doctor_patient_assignments.findFirst({
      where: {
        patient_id: patient.id,
        appointment_activity: { not: 'done' },
      },
      orderBy: { assigned_at: 'desc' },
    });
    if (!assignment)
      throw new NotFoundException('No active appointment to chat about.');

    let conversation = await this.prisma.chat_conversations.findUnique({
      where: { assignment_id: assignment.id },
    });

    if (!conversation) {
      conversation = await this.prisma.chat_conversations.create({
        data: {
          assignment_id: assignment.id,
          doctor_id: assignment.doctor_id,
          patient_id: assignment.patient_id,
        },
      });
    }

    return this.prisma.chat_conversations.findUnique({
      where: { id: conversation.id },
      include: {
        assignment: {
          select: { appointment_activity: true, patient_consent: true },
        },
        doctor: {
          select: { id: true, firstNameEn: true, lastNameEn: true },
        },
        patient: {
          select: { id: true, first_name_en: true, last_name_en: true },
        },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            sender_id: true,
            created_at: true,
            read: true,
          },
        },
      },
    });
  }

  async getConversations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });
    if (!user) return [];

    if (user.roleId === 7) {
      const patient = await this.prisma.patients.findFirst({
        where: { user_id: userId },
        select: { id: true },
      });
      if (!patient) return [];

      return this.prisma.chat_conversations.findMany({
        where: {
          patient_id: patient.id,
          assignment: { appointment_activity: { not: 'done' } },
        },
        include: {
          assignment: {
            select: { appointment_activity: true, patient_consent: true },
          },
          doctor: {
            select: {
              id: true,
              firstNameEn: true,
              lastNameEn: true,
            },
          },
          patient: {
            select: {
              id: true,
              first_name_en: true,
              last_name_en: true,
            },
          },
          messages: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              sender_id: true,
              created_at: true,
              read: true,
            },
          },
        },
        orderBy: { updated_at: 'desc' },
      });
    }

    // Doctor: show all active patient assignments (with conversation if exists)
    const assignments = await this.prisma.doctor_patient_assignments.findMany({
      where: {
        doctor_id: userId,
        appointment_activity: { not: 'done' },
      },
      include: {
        chat_conversation: {
          include: {
            messages: {
              orderBy: { created_at: 'desc' },
              take: 1,
              select: {
                id: true,
                content: true,
                sender_id: true,
                created_at: true,
                read: true,
              },
            },
          },
        },
        patient: {
          select: {
            id: true,
            first_name_en: true,
            last_name_en: true,
            user_id: true,
          },
        },
      },
      orderBy: { assigned_at: 'desc' },
    });

    return assignments.map((a) => ({
      id: a.chat_conversation?.id ?? `assignment:${a.id}`,
      assignment_id: a.id,
      doctor_id: a.doctor_id,
      patient_id: a.patient_id,
      created_at: a.chat_conversation?.created_at ?? null,
      updated_at: a.chat_conversation?.updated_at ?? null,
      assignment: {
        appointment_activity: a.appointment_activity,
        patient_consent: a.patient_consent,
      },
      doctor: null,
      patient: a.patient,
      messages: a.chat_conversation?.messages ?? [],
      _hasConversation: !!a.chat_conversation,
    }));
  }

  async getOrCreateConversation(assignmentId: string) {
    const assignment = await this.prisma.doctor_patient_assignments.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found.');
    if (assignment.appointment_activity === 'done')
      throw new NotFoundException('Appointment is completed.');

    let conversation = await this.prisma.chat_conversations.findUnique({
      where: { assignment_id: assignmentId },
    });

    if (!conversation) {
      conversation = await this.prisma.chat_conversations.create({
        data: {
          assignment_id: assignmentId,
          doctor_id: assignment.doctor_id,
          patient_id: assignment.patient_id,
        },
      });
    }

    return conversation;
  }

  private async isConversationParticipant(
    conversationId: string,
    userId: string,
  ) {
    const conversation = await this.prisma.chat_conversations.findUnique({
      where: { id: conversationId },
      select: { doctor_id: true, patient_id: true },
    });
    if (!conversation) return null;

    if (conversation.doctor_id === userId) return conversation;

    const patient = await this.prisma.patients.findUnique({
      where: { id: conversation.patient_id },
      select: { user_id: true },
    });
    if (patient?.user_id === userId) return conversation;

    return null;
  }

  async getMessages(conversationId: string, userId: string) {
    const conversation = await this.isConversationParticipant(
      conversationId,
      userId,
    );
    if (!conversation)
      throw new NotFoundException('Conversation not found or access denied.');

    const messages = await this.prisma.chat_messages.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
    });

    const lookupUserId = userId;
    await this.prisma.chat_messages.updateMany({
      where: {
        conversation_id: conversationId,
        sender_id: { not: lookupUserId },
        read: false,
      },
      data: { read: true },
    });

    return messages;
  }

  async sendMessage(conversationId: string, senderId: string, content: string) {
    const conversation = await this.isConversationParticipant(
      conversationId,
      senderId,
    );
    if (!conversation)
      throw new NotFoundException('Conversation not found or access denied.');

    const message = await this.prisma.chat_messages.create({
      data: {
        conversation_id: conversationId,
        sender_id: senderId,
        content,
      },
    });

    await this.prisma.chat_conversations.update({
      where: { id: conversationId },
      data: { updated_at: new Date() },
    });

    return message;
  }

  async getRecipientUserId(
    conversationId: string,
    senderUserId: string,
  ): Promise<string | null> {
    const conversation = await this.prisma.chat_conversations.findUnique({
      where: { id: conversationId },
      select: { doctor_id: true, patient_id: true },
    });
    if (!conversation) return null;

    if (conversation.doctor_id === senderUserId) {
      const patient = await this.prisma.patients.findUnique({
        where: { id: conversation.patient_id },
        select: { user_id: true },
      });
      return patient?.user_id ?? null;
    }

    return conversation.doctor_id;
  }

  async markRead(conversationId: string, userId: string) {
    await this.prisma.chat_messages.updateMany({
      where: {
        conversation_id: conversationId,
        sender_id: { not: userId },
        read: false,
      },
      data: { read: true },
    });

    return { success: true };
  }

  async getUnreadCounts(userId: string) {
    const patient = await this.prisma.patients.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });

    const conversations = await this.prisma.chat_conversations.findMany({
      where: {
        OR: [
          { doctor_id: userId },
          ...(patient ? [{ patient_id: patient.id }] : []),
        ],
        assignment: { appointment_activity: { not: 'done' } },
      },
      select: { id: true },
    });

    const counts = await Promise.all(
      conversations.map(async (c) => {
        const count = await this.prisma.chat_messages.count({
          where: {
            conversation_id: c.id,
            sender_id: { not: userId },
            read: false,
          },
        });
        return { conversationId: c.id, unreadCount: count };
      }),
    );

    return counts;
  }
}
