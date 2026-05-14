import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import App from './App';
import { store } from './store';
import './index.css';

const theme = {
  token: {
    colorPrimary: '#6200EE',
    colorLink:    '#6200EE',
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError:   '#EF4444',
    borderRadius:   10,
    borderRadiusLG: 14,
    borderRadiusSM: 6,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize:   14,
    colorBgContainer: '#FFFFFF',
    colorBgLayout:    '#F5F6FA',
    colorBorder:      '#E8EAF2',
    colorTextBase:    '#1A1D35',
    colorTextSecondary: '#6B7280',
    boxShadow:  '0 4px 16px rgba(0,0,0,0.08)',
  },
  components: {
    Layout: {
      siderBg:     '#0A0F2E',
      triggerBg:   '#111736',
      headerBg:    '#FFFFFF',
      headerHeight: 64,
      bodyBg:      '#F5F6FA',
    },
    Menu: {
      darkItemBg:         'transparent',
      darkSubMenuItemBg:  'transparent',
      darkItemSelectedBg: 'rgba(98,0,238,0.18)',
      darkItemSelectedColor: '#C4B5FD',
      darkItemColor:      'rgba(255,255,255,0.55)',
      darkItemHoverBg:    'rgba(255,255,255,0.06)',
      darkItemHoverColor: 'rgba(255,255,255,0.9)',
      itemBorderRadius:   10,
    },
    Table: {
      headerBg:         '#F5F6FA',
      headerColor:      '#6B7280',
      headerSortActiveBg: '#ECEEF5',
      rowHoverBg:       '#F9F7FF',
      borderColor:      '#E8EAF2',
    },
    Card: {
      borderRadiusLG: 16,
    },
    Button: {
      borderRadius: 8,
      fontWeight:   600,
    },
    Input: {
      borderRadius: 8,
    },
    Select: {
      borderRadius: 8,
    },
    Modal: {
      borderRadiusLG: 20,
    },
    Tag: {
      borderRadius: 6,
    },
  },
};


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ConfigProvider theme={theme}>
          <App />
        </ConfigProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
