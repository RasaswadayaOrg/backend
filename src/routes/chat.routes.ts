import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as chatController from '../controllers/chat.controller';

const router = Router();

// Get all conversations for a store owner
router.get('/store-conversations', authenticate as any, chatController.getStoreConversations as any);

// Get or create conversation for a specific store (Buyer side)
router.get('/conversations/:storeId', authenticate as any, chatController.getConversation as any);

// Send message to a conversation
router.post('/conversations/:conversationId/messages', authenticate as any, chatController.sendMessage as any);

export default router;
