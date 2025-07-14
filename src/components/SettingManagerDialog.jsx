import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, TextField, MenuItem, Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

const LOCAL_KEY = 'db_log_viewer_settings';

const getSavedSettings = () => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};
const saveSettings = (settings) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
};

const emptySetting = {
  name: '',
  dbType: '',
  uri: '',
  host: '',
  port: '',
  username: '',
  password: '',
  database: '',
  timezoneOffset: 0,
};

const SettingManagerDialog = ({ open, onClose, timezoneOffset = 0, setTimezoneOffset }) => {
  const [settings, setSettings] = useState(getSavedSettings());
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySetting);
  const [isNew, setIsNew] = useState(false);

  const handleEdit = (idx) => {
    setEditing(idx);
    setForm(settings[idx]);
    setIsNew(false);
  };
  const handleDelete = (idx) => {
    const newSettings = settings.filter((_, i) => i !== idx);
    setSettings(newSettings);
    saveSettings(newSettings);
    if (editing === idx) {
      setEditing(null);
      setForm(emptySetting);
    }
  };
  const handleAddNew = () => {
    setEditing(null);
    setForm(emptySetting);
    setIsNew(true);
  };
  const handleFormChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };
  const handleSave = () => {
    if (!form.name || !form.dbType) return;
    let newSettings;
    if (isNew) {
      newSettings = [...settings, form];
    } else if (editing !== null) {
      newSettings = settings.map((s, i) => (i === editing ? form : s));
    } else {
      return;
    }
    setSettings(newSettings);
    saveSettings(newSettings);
    setEditing(null);
    setForm(emptySetting);
    setIsNew(false);
  };
  const handleCancelEdit = () => {
    setEditing(null);
    setForm(emptySetting);
    setIsNew(false);
  };

  const handleTimezoneInput = (e) => {
    const val = e.target.value;
    if (/^-?\d*$/.test(val)) {
      setTimezoneOffset(Number(val));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{
        sx: {
          background: '#2d3340',
          color: '#f5f6fa',
        }
      }}
    >
      <DialogTitle sx={{ color: '#f5f6fa', background: '#2d3340' }}>Manage Connection Configurations</DialogTitle>
      <DialogContent sx={{ background: '#2d3340', color: '#f5f6fa',
        '&::-webkit-scrollbar': {
          width: '10px',
          background: '#2d3340',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#3a3f4b',
          borderRadius: '8px',
          border: '2px solid #2d3340',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#50576a',
        },
        '&::-webkit-scrollbar-track': {
          background: '#23272f',
          borderRadius: '8px',
        },
      }}>
        <Box sx={{ mb: 3, p: 2, border: '1px solid #333', borderRadius: 2, background: '#23272f', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
          <TextField
            fullWidth
            type="text"
            label="Global display timezone (UTC offset, e.g.: 0, -7, 7)"
            value={timezoneOffset}
            onChange={e => {
              const val = e.target.value;
              if (/^-?\d{0,2}$/.test(val) || val === '-23' || val === '23') {
                if (val === '' || val === '-') {
                  setTimezoneOffset(val);
                } else {
                  const num = Number(val);
                  if (num >= -23 && num <= 23) setTimezoneOffset(num);
                }
              }
            }}
            InputLabelProps={{ style: { color: '#bfc6d1' } }}
            InputProps={{ style: { color: '#f5f6fa' } }}
            helperText="Enter the hour offset from UTC. E.g.: Vietnam is 7, US is -7, default is 0."
          />
        </Box>
        <List sx={{ background: 'transparent', color: '#f5f6fa' }}>
          {settings.length === 0 && (
            <ListItem><ListItemText primary="No configuration found" /></ListItem>
          )}
          {settings.map((setting, idx) => (
            <ListItem key={idx} selected={editing === idx} sx={{ background: editing === idx ? '#23272f' : 'transparent', borderRadius: 2 }}>
              <ListItemText
                primary={setting.name}
                secondary={
                  setting.dbType === 'mongodb'
                    ? `MongoDB: ${setting.uri}`
                    : `${setting.dbType}: ${setting.host}:${setting.port} / ${setting.database}`
                }
                primaryTypographyProps={{ color: '#f5f6fa' }}
                secondaryTypographyProps={{ color: '#bfc6d1' }}
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" onClick={() => handleEdit(idx)} sx={{ color: '#42a5f5' }}><EditIcon /></IconButton>
                <IconButton edge="end" onClick={() => handleDelete(idx)} sx={{ color: '#ef5350' }}><DeleteIcon /></IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 2, mb: 1 }}>
          <Button startIcon={<AddIcon />} onClick={handleAddNew} variant="outlined" sx={{ color: '#42a5f5', borderColor: '#42a5f5' }}>Add new configuration</Button>
        </Box>
        {(editing !== null || isNew) && (
          <Box sx={{ p: 2, border: '1px solid #333', borderRadius: 2, background: '#23272f', mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
            <TextField
              fullWidth
              label="Configuration Name"
              value={form.name}
              onChange={handleFormChange('name')}
              sx={{ mb: 2 }}
              InputLabelProps={{ style: { color: '#bfc6d1' } }}
              InputProps={{ style: { color: '#f5f6fa' } }}
            />
            <TextField
              select
              fullWidth
              label="Database Type"
              value={form.dbType}
              onChange={handleFormChange('dbType')}
              sx={{ mb: 2 }}
              InputLabelProps={{ style: { color: '#bfc6d1' } }}
              InputProps={{ style: { color: '#f5f6fa' } }}
            >
              <MenuItem value="mongodb">MongoDB</MenuItem>
              <MenuItem value="postgresql">PostgreSQL</MenuItem>
              <MenuItem value="sql">SQL</MenuItem>
            </TextField>
            {form.dbType === 'mongodb' ? (
              <TextField
                fullWidth
                label="MongoDB URI"
                value={form.uri}
                onChange={handleFormChange('uri')}
                sx={{ mb: 2 }}
                InputLabelProps={{ style: { color: '#bfc6d1' } }}
                InputProps={{ style: { color: '#f5f6fa' } }}
              />
            ) : form.dbType ? (
              <>
                <TextField
                  fullWidth
                  label="Host"
                  value={form.host}
                  onChange={handleFormChange('host')}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ style: { color: '#bfc6d1' } }}
                  InputProps={{ style: { color: '#f5f6fa' } }}
                />
                <TextField
                  fullWidth
                  label="Port"
                  value={form.port}
                  onChange={handleFormChange('port')}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ style: { color: '#bfc6d1' } }}
                  InputProps={{ style: { color: '#f5f6fa' } }}
                />
                <TextField
                  fullWidth
                  label="Username"
                  value={form.username}
                  onChange={handleFormChange('username')}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ style: { color: '#bfc6d1' } }}
                  InputProps={{ style: { color: '#f5f6fa' } }}
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={handleFormChange('password')}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ style: { color: '#bfc6d1' } }}
                  InputProps={{ style: { color: '#f5f6fa' } }}
                />
                <TextField
                  fullWidth
                  label="Database"
                  value={form.database}
                  onChange={handleFormChange('database')}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ style: { color: '#bfc6d1' } }}
                  InputProps={{ style: { color: '#f5f6fa' } }}
                />
              </>
            ) : null}
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Button variant="contained" onClick={handleSave} disabled={!form.name || !form.dbType} sx={{ background: '#42a5f5', color: '#fff' }}>
                Lưu
              </Button>
              <Button variant="outlined" onClick={handleCancelEdit} sx={{ color: '#bfc6d1', borderColor: '#bfc6d1' }}>Huỷ</Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ background: '#2d3340', color: '#f5f6fa' }}>
        <Button onClick={onClose} sx={{ color: '#42a5f5' }}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingManagerDialog; 