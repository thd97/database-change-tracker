import React, { useState, useEffect } from 'react';
import { Tabs, Tab, IconButton, Tooltip, Box } from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import ConnectionForm from './components/ConnectionForm';
import LogViewer from './components/LogViewer';
import { AppContainer, StyledAppBar, StyledTabs, StyledTab, StyledIconButton, AddTabButton, GlobalScrollbarStyle } from './App.styled';
import SettingManagerDialog from './components/SettingManagerDialog';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#42a5f5',
    },
    background: {
      default: '#23272f',
      paper: '#2d3340',
    },
    text: {
      primary: '#f5f6fa',
      secondary: '#bfc6d1',
    },
    error: {
      main: '#ef5350',
    },
    success: {
      main: '#66bb6a',
    },
    warning: {
      main: '#ffa726',
    },
    info: {
      main: '#29b6f6',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

const TIMEZONE_KEY = 'db_log_viewer_timezone_offset';

const App = () => {
  const [tabs, setTabs] = useState([
    {
      id: 1,
      title: 'Tab 1',
      dbType: null,
      connectionInfo: null,
      formState: { dbType: '', uri: '', host: '', port: '', username: '', password: '', database: '' },
      dbList: [],
      selectedDb: '',
      loading: false,
      error: '',
      collections: [],
      logs: [],
      logError: '',
    },
  ]);
  const [activeTab, setActiveTab] = useState(0);
  const [openSettingManager, setOpenSettingManager] = useState(false);
  const [timezoneOffset, setTimezoneOffset] = useState(() => {
    const raw = localStorage.getItem(TIMEZONE_KEY);
    return raw !== null ? Number(raw) : 0;
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        const tabIndex = parseInt(event.key) - 1;
        if (tabIndex >= 0 && tabIndex < tabs.length) {
          event.preventDefault();
          setActiveTab(tabIndex);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tabs.length]);

  useEffect(() => {
    const unsubscribers = [];
    tabs.forEach((tab, idx) => {
      if (tab && tab.dbType === 'mongodb' && tab.connectionInfo && tab.connectionInfo.uri && tab.connectionInfo.database) {
        const { ipcRenderer } = window.require('electron');
        const channel = `db-log-event-${tab.id}`;
        ipcRenderer.send('db-watch-log', { uri: tab.connectionInfo.uri, database: tab.connectionInfo.database, channel });
        const onLog = (evt, log) => {
          setTabs(tabs => {
            const updated = [...tabs];
            if (updated[idx]) {
              updated[idx] = { ...updated[idx], logs: [...(updated[idx].logs || []), log] };
            }
            return updated;
          });
        };
        const onError = (evt, errMsg) => {
          setTabs(tabs => {
            const updated = [...tabs];
            if (updated[idx]) {
              updated[idx] = { ...updated[idx], logError: errMsg };
            }
            return updated;
          });
        };
        ipcRenderer.on(channel, onLog);
        ipcRenderer.on(`${channel}-error`, onError);
        unsubscribers.push(() => {
          ipcRenderer.send('db-log-unsubscribe', { channel });
          ipcRenderer.removeListener(channel, onLog);
          ipcRenderer.removeListener(`${channel}-error`, onError);
        });
      }
    });
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [tabs.length, ...tabs.map(tab => tab.dbType === 'mongodb' ? `${tab.connectionInfo?.uri}-${tab.connectionInfo?.database}` : '')]);

  const addTab = () => {
    const newTab = {
      id: tabs.length + 1,
      title: `Tab ${tabs.length + 1}`,
      dbType: null,
      connectionInfo: null,
      formState: { dbType: '', uri: '', host: '', port: '', username: '', password: '', database: '' },
      dbList: [],
      selectedDb: '',
      loading: false,
      error: '',
      collections: [],
      logs: [],
      logError: '',
      selectedOps: [],
      selectedCols: [],
      searchId: '',
    };
    setTabs([...tabs, newTab]);
    setActiveTab(tabs.length);
  };

  const removeTab = (index) => {
    const newTabs = tabs.filter((_, i) => i !== index);
    const updatedTabs  = newTabs.map((tab, i) => {
      const newId = i + 1;
      const newTitle = tab.dbType
        ? `${tab.dbType} - ${tab.connectionInfo.database || tab.connectionInfo.uri}`
        : `Tab ${newId}`;
      return {
        ...tab,
        id: newId,
        title: newTitle,
      };
    });
    setTabs(updatedTabs);
    if (activeTab >= newTabs.length) {
      setActiveTab(newTabs.length - 1);
    } else if (activeTab > index) {
      setActiveTab(activeTab - 1);
    }
  };

  const handleConnect = async (index, dbType, connectionInfo) => {
    const updatedTabs = [...tabs];
    updatedTabs[index].dbType = dbType;
    updatedTabs[index].connectionInfo = connectionInfo;
    updatedTabs[index].title = `${dbType} - ${connectionInfo.database || connectionInfo.uri}`;
    if (dbType === 'mongodb' && connectionInfo.uri && connectionInfo.database) {
      try {
        const { MongoClient } = window.require('mongodb');
        const client = new MongoClient(connectionInfo.uri);
        await client.connect();
        const colls = await client.db(connectionInfo.database).listCollections().toArray();
        updatedTabs[index].collections = colls.map(c => c.name);
        await client.close();
      } catch {
        updatedTabs[index].collections = [];
      }
    }
    updatedTabs[index].logs = [];
    updatedTabs[index].logError = '';
    updatedTabs[index].selectedOps = [];
    updatedTabs[index].selectedCols = [];
    updatedTabs[index].searchId = '';
    if (dbType === 'postgresql' || dbType === 'sql') {
      updatedTabs[index].dbList = [];
      updatedTabs[index].loading = false;
      updatedTabs[index].error = '';
      updatedTabs[index].selectedDb = '';
    }
    setTabs(updatedTabs);
  };

  const updateFormState = (index, newFormState) => {
    const updatedTabs = [...tabs];
    updatedTabs[index].formState = newFormState;
    setTabs(updatedTabs);
  };

  const updateTabState = (index, patch) => {
    setTabs(tabs => {
      const updated = [...tabs];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  const clearTabLog = (tabIdx) => {
    setTabs(tabs => {
      const updated = [...tabs];
      if (updated[tabIdx]) updated[tabIdx] = { ...updated[tabIdx], logs: [] };
      return updated;
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalScrollbarStyle />
      <AppContainer>
        <StyledAppBar position="static" color="transparent" elevation={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', height: 48 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: 48 }}>
              <Tooltip title="Manage Settings">
                <IconButton onClick={() => setOpenSettingManager(true)} sx={{ mr: 1, height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SettingsIcon fontSize="medium" />
                </IconButton>
              </Tooltip>
            </Box>
            <StyledTabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ flex: 1 }}
            >
              {tabs.map((tab, index) => (
                <StyledTab
                  key={tab.id}
                  label={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {tab.title}
                      <StyledIconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTab(index);
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </StyledIconButton>
                    </div>
                  }
                />
              ))}
              <AddTabButton onClick={addTab}>
                <AddIcon fontSize="small" />
              </AddTabButton>
            </StyledTabs>
          </Box>
        </StyledAppBar>
        <div style={{ flex: 1, minHeight: 0, padding: '24px 24px 0 24px', overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
          {tabs[activeTab] && (
            tabs[activeTab].dbType ? (
              <LogViewer
                connectionInfo={tabs[activeTab].connectionInfo}
                dbType={tabs[activeTab].dbType}
                collections={tabs[activeTab].collections}
                logs={tabs[activeTab].logs}
                setLogs={logs => updateTabState(activeTab, { logs })}
                logError={tabs[activeTab].logError}
                onClearLog={() => clearTabLog(activeTab)}
                selectedOps={tabs[activeTab].selectedOps}
                setSelectedOps={selectedOps => updateTabState(activeTab, { selectedOps })}
                selectedCols={tabs[activeTab].selectedCols}
                setSelectedCols={selectedCols => updateTabState(activeTab, { selectedCols })}
                searchId={tabs[activeTab].searchId}
                setSearchId={searchId => updateTabState(activeTab, { searchId })}
                timezoneOffset={timezoneOffset}
              />
            ) : (
              <ConnectionForm
                formState={tabs[activeTab].formState}
                onFormChange={(newFormState) => updateFormState(activeTab, newFormState)}
                onConnect={(dbType, connectionInfo) => handleConnect(activeTab, dbType, connectionInfo)}
                dbList={tabs[activeTab].dbList}
                selectedDb={tabs[activeTab].selectedDb}
                loading={tabs[activeTab].loading}
                error={tabs[activeTab].error}
                setDbList={dbs => updateTabState(activeTab, { dbList: dbs })}
                setSelectedDb={db => updateTabState(activeTab, { selectedDb: db })}
                setLoading={val => updateTabState(activeTab, { loading: val })}
                setError={val => updateTabState(activeTab, { error: val })}
              />
            )
          )}
        </div>
        <SettingManagerDialog open={openSettingManager} onClose={() => setOpenSettingManager(false)}
          timezoneOffset={timezoneOffset}
          setTimezoneOffset={offset => {
            setTimezoneOffset(offset);
            localStorage.setItem(TIMEZONE_KEY, String(offset));
          }}
        />
      </AppContainer>
    </ThemeProvider>
  );
};

export default App;