import React from 'react';
import SimpleDashboard from '../components/SimpleDashboard';

const SimpleDashboardPage: React.FC = () => {
    // Get store info from localStorage or use default
    const storeId = localStorage.getItem('selectedStoreId') || 'STORE001';
    const storeName = localStorage.getItem('selectedStoreName') || 'Sharma Kirana Store, Varanasi';

    return <SimpleDashboard storeId={storeId} storeName={storeName} />;
};

export default SimpleDashboardPage;
