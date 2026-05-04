import { Request, Response } from 'express';
import { prisma } from '../lib/db';

export const getConversation = async (req: Request, res: Response) => {
  try {
    const storeId = req.params.storeId as string;
    const buyerId = (req as any).user.id; // from authenticate middleware

    // Ensure store exists
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    let conversation = await prisma.conversation.findUnique({
      where: {
        buyerId_storeId: {
          buyerId,
          storeId
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          buyerId,
          storeId
        },
        include: {
          messages: true
        }
      });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.conversationId as string;
    const { text } = req.body;
    const senderId = (req as any).user.id;

    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        text,
      }
    });

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStoreConversations = async (req: Request, res: Response) => {
  try {
    const ownerId = (req as any).user.id;

    // Find the store belonging to the logged-in user
    const store = await prisma.store.findUnique({ where: { ownerId } });
    if (!store) {
      return res.status(404).json({ message: 'Store not found for this user' });
    }

    // Get all conversations for this store
    const conversations = await prisma.conversation.findMany({
      where: { storeId: store.id },
      include: {
        buyer: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            fullName: true,
            avatarUrl: true 
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching store conversations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
