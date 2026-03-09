import { useState, useEffect } from 'react';

export type Language = 'en' | 'hi';

interface Translations {
    [key: string]: {
        en: string;
        hi: string;
    };
}

const translations: Translations = {
    // Common
    'common.loading': { en: 'Loading...', hi: 'लोड हो रहा है...' },
    'common.error': { en: 'Error', hi: 'त्रुटि' },
    'common.success': { en: 'Success', hi: 'सफलता' },
    'common.close': { en: 'Close', hi: 'बंद करें' },
    'common.refresh': { en: 'Refresh', hi: 'रीफ्रेश करें' },
    'common.send': { en: 'Send', hi: 'भेजें' },
    'common.retry': { en: 'Retry', hi: 'पुनः प्रयास करें' },
    
    // AI Chat
    'chat.title': { en: 'AI Assistant', hi: 'AI सहायक' },
    'chat.subtitle': { en: 'Ask me anything about your inventory', hi: 'अपनी इन्वेंटरी के बारे में कुछ भी पूछें' },
    'chat.placeholder': { en: 'Ask about inventory...', hi: 'इन्वेंटरी के बारे में पूछें...' },
    'chat.welcome': { en: "Hi! I'm your AI inventory assistant. Ask me about stock levels, risks, or recommendations.", hi: 'नमस्ते! मैं आपका AI इन्वेंटरी सहायक हूं। मुझसे स्टॉक स्तर, जोखिम या सिफारिशों के बारे में पूछें।' },
    'chat.analyzing': { en: 'AI analyzing...', hi: 'AI विश्लेषण कर रहा है...' },
    'chat.error': { en: 'Sorry, I encountered an error. Please try again.', hi: 'क्षमा करें, मुझे एक त्रुटि का सामना करना पड़ा। कृपया पुनः प्रयास करें।' },
    'chat.prompt1': { en: 'Which SKUs are critical?', hi: 'कौन से उत्पाद महत्वपूर्ण हैं?' },
    'chat.prompt2': { en: 'Show me high risk items', hi: 'उच्च जोखिम वाली वस्तुएं दिखाएं' },
    'chat.prompt3': { en: 'What should I reorder?', hi: 'मुझे क्या पुनः ऑर्डर करना चाहिए?' },
    
    // Alerts
    'alerts.title': { en: 'Active Alerts', hi: 'सक्रिय अलर्ट' },
    'alerts.needAttention': { en: 'need attention', hi: 'ध्यान देने की आवश्यकता है' },
    'alerts.noAlerts': { en: 'No active alerts', hi: 'कोई सक्रिय अलर्ट नहीं' },
    'alerts.acknowledge': { en: 'Acknowledge', hi: 'स्वीकार करें' },
    'alerts.critical': { en: 'CRITICAL', hi: 'गंभीर' },
    'alerts.high': { en: 'HIGH', hi: 'उच्च' },
    'alerts.medium': { en: 'MEDIUM', hi: 'मध्यम' },
    'alerts.low': { en: 'LOW', hi: 'निम्न' },
    
    // Dashboard
    'dashboard.title': { en: 'Inventory Intelligence Dashboard', hi: 'इन्वेंटरी इंटेलिजेंस डैशबोर्ड' },
    'dashboard.subtitle': { en: 'AI-Powered Insights • Real-time Risk Detection • Smart Recommendations', hi: 'AI-संचालित अंतर्दृष्टि • रीयल-टाइम जोखिम पहचान • स्मार्ट सिफारिशें' },
    'dashboard.lastAnalysis': { en: 'Last AI analysis', hi: 'अंतिम AI विश्लेषण' },
    'dashboard.refreshAI': { en: 'Refresh AI', hi: 'AI रीफ्रेश करें' },
    'dashboard.importData': { en: 'Import Data', hi: 'डेटा आयात करें' },
    'dashboard.export': { en: 'Export', hi: 'निर्यात करें' },
    'dashboard.filters': { en: 'Filters', hi: 'फ़िल्टर' },
    'dashboard.settings': { en: 'Settings', hi: 'सेटिंग्स' },
    'dashboard.totalSkus': { en: 'Total SKUs', hi: 'कुल उत्पाद' },
    'dashboard.needAction': { en: 'Need Action', hi: 'कार्रवाई चाहिए' },
    'dashboard.criticalRisk': { en: 'Critical Risk', hi: 'गंभीर जोखिम' },
    'dashboard.healthyStock': { en: 'Healthy Stock', hi: 'स्वस्थ स्टॉक' },
    'dashboard.riskDistribution': { en: 'Risk Distribution', hi: 'जोखिम वितरण' },
    'dashboard.aiSummary': { en: 'AI Intelligence Summary', hi: 'AI इंटेलिजेंस सारांश' },
    'dashboard.criticalItems': { en: 'Critical Items', hi: 'महत्वपूर्ण वस्तुएं' },
    'dashboard.highRiskItems': { en: 'High Risk Items', hi: 'उच्च जोखिम वस्तुएं' },
    
    // Scenarios
    'scenario.normal': { en: 'Normal weekday demand', hi: 'सामान्य सप्ताह की मांग' },
    'scenario.festival': { en: 'Festival spike (Diwali / Pongal)', hi: 'त्योहार वृद्धि (दिवाली / पोंगल)' },
    'scenario.slump': { en: 'Monsoon / off-season slump', hi: 'मानसून / ऑफ-सीजन मंदी' },
    'scenario.weekday': { en: 'Weekday', hi: 'सप्ताह का दिन' },
    'scenario.festivalShort': { en: 'Festival', hi: 'त्योहार' },
    'scenario.slumpShort': { en: 'Slump', hi: 'मंदी' },
    
    // Tabs
    'tabs.simple': { en: 'Simple Dashboard', hi: 'सरल डैशबोर्ड' },
    'tabs.advanced': { en: 'Advanced Dashboard', hi: 'उन्नत डैशबोर्ड' },
    'tabs.multiStore': { en: 'Multi-Store Analytics', hi: 'मल्टी-स्टोर विश्लेषण' },
    
    // App Header
    'app.title': { en: 'RetailMind - AI for Bharat Hackathon', hi: 'RetailMind - AI फॉर भारत हैकथॉन' },
    'app.logout': { en: 'Logout', hi: 'लॉगआउट' },
    
    // AWS Branding
    'aws.poweredBy': { en: 'Powered by AWS', hi: 'AWS द्वारा संचालित' },
    'aws.services': { en: 'AWS Services Used', hi: 'उपयोग की गई AWS सेवाएं' },
    'aws.lambda': { en: 'AWS Lambda (Serverless)', hi: 'AWS Lambda (सर्वरलेस)' },
    'aws.dynamodb': { en: 'Amazon DynamoDB (Database)', hi: 'Amazon DynamoDB (डेटाबेस)' },
    'aws.bedrock': { en: 'Amazon Bedrock Nova (AI)', hi: 'Amazon Bedrock Nova (AI)' },
    'aws.kms': { en: 'AWS KMS (Security)', hi: 'AWS KMS (सुरक्षा)' },
    'aws.s3': { en: 'Amazon S3 (Storage)', hi: 'Amazon S3 (स्टोरेज)' },
    'aws.apiGateway': { en: 'AWS API Gateway (APIs)', hi: 'AWS API Gateway (APIs)' },
    
    // Production Features
    'prod.lastUpdated': { en: 'Last updated', hi: 'अंतिम अपडेट' },
    'prod.secondsAgo': { en: 'seconds ago', hi: 'सेकंड पहले' },
    'prod.minutesAgo': { en: 'minutes ago', hi: 'मिनट पहले' },
    'prod.online': { en: 'Online', hi: 'ऑनलाइन' },
    'prod.offline': { en: 'Offline', hi: 'ऑफ़लाइन' },
    'prod.reorderNow': { en: 'Reorder Now', hi: 'अभी पुनः ऑर्डर करें' },
    'prod.businessHours': { en: 'Business Hours: 6 AM - 10 PM', hi: 'व्यापार समय: सुबह 6 - रात 10' },
    'prod.todaysTarget': { en: "Today's Target", hi: 'आज का लक्ष्य' },
    'prod.peakHours': { en: 'Peak Hours', hi: 'पीक आवर्स' },
};

export const useTranslation = () => {
    const [language, setLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem('language');
        return (saved === 'hi' ? 'hi' : 'en') as Language;
    });

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    const t = (key: string): string => {
        return translations[key]?.[language] || key;
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'hi' : 'en');
    };

    return { language, setLanguage, t, toggleLanguage };
};
