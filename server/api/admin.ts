import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

// GET dashboard configuration
router.get('/dashboard/config', async (req, res) => {
  try {
    // For now, return a default configuration
    // In a real implementation, this would fetch from database
    res.json({
      widgets: [],
      settings: {
        refreshInterval: 60,
        defaultLayout: 'grid',
        theme: 'light'
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard config:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard configuration' });
  }
});

// POST dashboard configuration
router.post('/dashboard/config', async (req, res) => {
  try {
    const config = req.body;
    
    // In a real implementation, this would save to the database
    // For now, just echo back the config as if it was saved
    res.json(config);
  } catch (error) {
    console.error('Error saving dashboard config:', error);
    res.status(500).json({ message: 'Failed to save dashboard configuration' });
  }
});

// GET dashboard data sources
router.get('/dashboard/data-sources', async (req, res) => {
  try {
    // Return available data sources
    res.json([
      { id: 'employees', name: 'Employees', type: 'collection' },
      { id: 'attendance', name: 'Attendance', type: 'collection' },
      { id: 'projects', name: 'Projects', type: 'collection' },
      { id: 'payroll', name: 'Payroll', type: 'collection' },
      { id: 'system', name: 'System Stats', type: 'metrics' }
    ]);
  } catch (error) {
    console.error('Error fetching data sources:', error);
    res.status(500).json({ message: 'Failed to fetch data sources' });
  }
});

// GET dashboard stats 
router.get('/dashboard', async (req, res) => {
  try {
    // Return dashboard statistics for admin
    res.json({
      stats: {
        usersCount: { admin: 1, hr: 2, viewer: 4, total: 7 },
        projects: { active: 5, completed: 3, total: 8 },
        errors: { unresolved: 2, total: 15 },
        system: { uptime: "7 days", version: "1.2.0" }
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch admin dashboard stats' });
  }
});

export default router;