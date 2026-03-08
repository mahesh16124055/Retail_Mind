import React, { useState } from 'react';
import '../styles/StoreSelector.css';

interface StoreSelectorProps {
  onStoreSelect: (storeId: string) => void;
  currentStore: string;
}

const STORES = [
  { id: '101', name: 'Mumbai Central Store', location: 'Mumbai, Maharashtra' },
  { id: '102', name: 'Delhi NCR Store', location: 'New Delhi' },
  { id: '103', name: 'Bangalore Tech Store', location: 'Bangalore, Karnataka' },
  { id: '104', name: 'Chennai Marina Store', location: 'Chennai, Tamil Nadu' },
  { id: '105', name: 'Kolkata Park Store', location: 'Kolkata, West Bengal' },
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
