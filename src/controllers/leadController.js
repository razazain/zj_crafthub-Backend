import Lead from "../models/leadModel.js";
import Contact from "../models/ContactModel.js";

// contact us
export const createContact = async (req, res) => {
    try {
        const { name, email, phoneNumber, message } = req.body; 

        const newContact = new Contact({
            name,
            email,
            phoneNumber,
            message,
        });     

        await newContact.save();
        // create lead entry
        await new Lead({ name, email, phoneNumber }).save();

        res.status(201).json({          
            success: true,
            message: "Contact message submitted successfully",
            contact: newContact,
        });
    } catch (error) {
        console.error("Create Contact Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to submit contact message",
            error: error.message,
        });
    }   
};

//get contacts
export const getContacts = async (req, res) => {
    try {
        const contacts = await Contact.find();
        res.status(200).json({ success: true, contacts });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }   
};


// create lead
export const subscribeEmail = async (req, res) => {
    try {
        const { email, } = req.body;              
        
        const newLead = new Lead({
            email,
        });
        await newLead.save();
        res.status(201).json({          
            success: true,
            message: "you Subscribed",
            lead: newLead,
        });
    } catch (error) {
        console.error("Create Lead Error:", error);
        res.status(500).json({      
            success: false,
            message: "Failed to create lead",
            error: error.message,
        });
    }       


};

// get all leads
export const getLeads = async (req, res) => {
    try {
        const leads = await Lead.find();    
        res.status(200).json({ success: true, leads });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }

};

