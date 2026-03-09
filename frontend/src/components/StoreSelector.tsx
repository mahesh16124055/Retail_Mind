import React, { useState } from 'react';
import '../styles/StoreSelector.css';

interface StoreSelectorProps {
  onStoreSelect: (storeId: string) => void;
  currentStore: string;
}

const STORES = [
  { id: '101', name: 'Sharma Kirana Store', location: 'Varanasi, Uttar Pradesh' },
  { id: '102', name: 'Patel General Store', location: 'Ahmedabad, Gujarat' },
  { id: '103', name: 'Kumar Provision Store', location: 'Patna, Bihar' },
  { id: '104', name: 'Singh Grocery', location: 'Amritsar, Punjab' },
  { id: '105', name: 'Reddy Supermarket', location: 'Hyderabad, Telangana' },
];

const StoreSelector: React.FC<StoreSelectorProps> = ({ onStoreSelect, currentStore }) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentStoreData = STORES.find(s => s.id === currentStore) || STORES[0];

  const handleSelect = (storeId: string) => {
    onStoreSelect(storeId);
    setIsOpen(false);
  };

  return (
    <div className="store-selector">
      <button 
        className="store-selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="store-info">
          <span className="store-icon">🏪</span>
          <div className="store-details">
            <div className="store-name">{currentStoreData.name}</div>
            <div className="store-location">{currentStoreData.location}</div>
          </div>
        </div>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <>
          <div className="store-dropdown-overlay" onClick={() => setIsOpen(false)} />
          <div className="store-dropdown">
            {STORES.map(store => (
              <button
                key={store.id}
                className={`store-option ${store.id === currentStore ? 'active' : ''}`}
                onClick={() => handleSelect(store.id)}
              >
                <span className="store-icon">🏪</span>
                <div className="store-details">
                  <div className="store-name">{store.name}</div>
                  <div className="store-location">{store.location}</div>
                </div>
                {store.id === currentStore && <span className="check-icon">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StoreSelector;
