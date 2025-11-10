import express from 'express';
import { adminOnly } from '../middlewares/authMiddleware.js';
import {
    subscribeEmail,
    getLeads,
    createContact,
    getContacts,
  
} from '../controllers/leadController.js';

const router = express.Router();

// 🆕 Create lead
router.post('/', subscribeEmail);
// 📋 Get all leads (admin only)
router.get('/', adminOnly, getLeads);


router.post('/contact', createContact);
// 📋 Get all contacts (admin only
router.get('/contact', adminOnly, getContacts);

export default router;





