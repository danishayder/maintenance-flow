const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const jobsRoutes = require('./routes/jobs');
const amcsRoutes = require('./routes/amcs');
const invoicesRoutes = require('./routes/invoices');
const clientsRoutes = require('./routes/clients');
const techniciansRoutes = require('./routes/technicians');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/amcs', amcsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/technicians', techniciansRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));