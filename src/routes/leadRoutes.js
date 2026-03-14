import express from 'express';
import {protect, adminOnly } from '../middlewares/authMiddleware.js';
import {
    subscribeEmail,
    getLeads,
    createContact,
    getContacts,
  
} from '../controllers/leadController.js';

const router = express.Router();



// 🆕 Create lead
router.post('/', subscribeEmail);



router.post('/contact', createContact);
// 📋 Get all contacts (admin only
router.get('/contact', protect, adminOnly,  getContacts);
// 📋 Get all leads (admin only)
router.get('/', protect, adminOnly, getLeads);

export default router;





