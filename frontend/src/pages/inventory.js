import React, { useState, useEffect } from 'react';
import { inventoryAPI } from '../api';
import { getErrorMessage } from '../utils/errorHandler';
import '../styles/inventory.css';

function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  
  const [formData, setFormData] = useState({
    item_name: '',
    category: '',
    description: '',
    quantity: 0,
    unit: '',
    unit_price: 0,
    reorder_level: 10,
    supplier_name: '',
    location: ''
  });

  useEffect(() => {
    // Get current user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getAll();
      setInventory(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load inventory');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Clean the form data: convert empty strings to null for optional fields
      const cleanedData = {
        ...formData,
        category: formData.category || null,
        description: formData.description || null,
        unit: formData.unit || null,
        unit_price: formData.unit_price || null,
        supplier_name: formData.supplier_name || null,
        location: formData.location || null,
      };

      if (editingItem) {
        await inventoryAPI.update(editingItem.item_id, cleanedData);
      } else {
        await inventoryAPI.create(cleanedData);
      }
      loadInventory();
      closeModal();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save item'));
    }
  };

  const handleDelete = async (item_id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await inventoryAPI.delete(item_id);
        loadInventory();
      } catch (err) {
        setError('Failed to delete item');
      }
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        item_name: '',
        category: '',
        description: '',
        quantity: 0,
        unit: '',
        unit_price: 0,
        reorder_level: 10,
        supplier_name: '',
        location: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setError('');
  };

  const filteredInventory = filterCategory === 'all' 
    ? inventory 
    : inventory.filter(item => item.category === filterCategory);

  const lowStockItems = inventory.filter(item => item.quantity <= item.reorder_level);
  const categories = [...new Set(inventory.map(item => item.category).filter(Boolean))];
  
  // Only admins and project managers can manage inventory
  const canManageInventory = currentUser && (currentUser.role === 'admin' || currentUser.role === 'project_manager');

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>Inventory Management</h1>
        {canManageInventory && (
          <button className="btn-primary" onClick={() => openModal()}>
            + Add Item
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="inventory-stats">
        <div className="stat-card">
          <h3>Total Items</h3>
          <p className="stat-value">{inventory.length}</p>
        </div>
        <div className="stat-card warning">
          <h3>Low Stock</h3>
          <p className="stat-value">{lowStockItems.length}</p>
        </div>
        <div className="stat-card">
          <h3>Categories</h3>
          <p className="stat-value">{categories.length}</p>
        </div>
        <div className="stat-card">
          <h3>Total Value</h3>
          <p className="stat-value">
            ${inventory.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="inventory-filters">
        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading inventory...</div>
      ) : (
        <div className="inventory-table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Unit Price</th>
                <th>Total Value</th>
                <th>Reorder Level</th>
                <th>Supplier</th>
                <th>Location</th>
                {canManageInventory && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => (
                <tr key={item.item_id} className={item.quantity <= item.reorder_level ? 'low-stock' : ''}>
                  <td>{item.item_name}</td>
                  <td>{item.category || 'N/A'}</td>
                  <td>
                    <span className={item.quantity <= item.reorder_level ? 'badge-warning' : ''}>
                      {item.quantity}
                    </span>
                  </td>
                  <td>{item.unit || 'N/A'}</td>
                  <td>${item.unit_price?.toFixed(2) || '0.00'}</td>
                  <td>${(item.quantity * (item.unit_price || 0)).toFixed(2)}</td>
                  <td>{item.reorder_level}</td>
                  <td>{item.supplier_name || 'N/A'}</td>
                  <td>{item.location || 'N/A'}</td>
                  {canManageInventory && (
                    <td className="actions">
                      <button className="btn-edit" onClick={() => openModal(item)}>
                        Edit
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(item.item_id)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Item Name *</label>
                  <input
                    type="text"
                    value={formData.item_name}
                    onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    placeholder="e.g., pcs, kg, m"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="form-group">
                  <label>Reorder Level *</label>
                  <input
                    type="number"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({...formData, reorder_level: parseInt(e.target.value) || 10})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Supplier Name</label>
                  <input
                    type="text"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;