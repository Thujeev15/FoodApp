const express = require('express');
const router = express.Router();
const { getUsers, getUser, updateUser, deleteUser, getRiders, createRider, updateRider, deleteRider } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/adminMiddleware');

// Rider management
router.get('/riders/all', protect, admin, getRiders);
router.post('/riders/create', protect, admin, createRider);
router.put('/riders/:id', protect, admin, updateRider);
router.delete('/riders/:id', protect, admin, deleteRider);

// User management
router.get('/', protect, admin, getUsers);
router.get('/:id', protect, admin, getUser);
router.put('/:id', protect, admin, updateUser);
router.delete('/:id', protect, admin, deleteUser);

module.exports = router;
