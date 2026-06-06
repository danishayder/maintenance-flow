const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const jobsRoutes = require('./routes/jobs');
const amcsRoutes = require('./routes/amcs');
const invoicesRoutes = require('./routes/invoices');
const clientsRoutes = require('./routes/clients');
const techniciansRoutes = require('./routes/technicians');
const servicesRoutes = require('./routes/services');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require login)
app.use('/api/jobs', authMiddleware, jobsRoutes);
app.use('/api/amcs', authMiddleware, amcsRoutes);
app.use('/api/invoices', authMiddleware, invoicesRoutes);
app.use('/api/clients', authMiddleware, clientsRoutes);
app.use('/api/technicians', authMiddleware, techniciansRoutes);
app.use('/api/services', authMiddleware, servicesRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));