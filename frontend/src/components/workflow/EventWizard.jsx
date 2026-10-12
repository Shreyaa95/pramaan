import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Sparkles,
  LayoutTemplate,
  Database,
  Globe2,
  FileSpreadsheet,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Send,
  Download,
  RotateCw,
  Eye,
  FileCheck2,
  ExternalLink,
  ShieldCheck,
  Check,
  Mail,
  Settings,
  Info,
  Trash2
} from 'lucide-react';
import { Stepper } from '../common/Stepper';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { CertificateVisualEditor } from '../editor/CertificateVisualEditor';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { RestApiConnector } from './RestApiConnector';
import { DatabaseConnector } from './DatabaseConnector';
import { RecipientImportPreview } from './RecipientImportPreview';

const WIZARD_STEPS = [
  { id: 'event', title: '1. Event Info', subtitle: 'Batch details' },
  { id: 'template', title: '2. Template', subtitle: 'Design & fields' },
  { id: 'source', title: '3. Data Source', subtitle: 'REST / File / Database' },
  { id: 'mapping', title: '4. Map & Validate', subtitle: 'Field linkage' },
  { id: 'generate', title: '5. PDF Generation', subtitle: 'Bulk render' },
  { id: 'dispatch', title: '6. Email Dispatch', subtitle: 'Nodemailer' },
  { id: 'audit', title: '7. Delivery Audit', subtitle: 'Track & retry' },
];

export function EventWizard({ initialEvent, onComplete }) {
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Event Details
  const [eventData, setEventData] = useState({
    name: initialEvent?.name || '',
    description: initialEvent?.description || '',
    eventDate: initialEvent?.eventDate || new Date().toISOString().split('T')[0],
    organizationName: initialEvent?.organizationName || 'The Uniques Community',
    certificatePrefix: initialEvent?.certificatePrefix || 'CERT',
    templateId: initialEvent?.templateId || null
  });
  const [activeEvent, setActiveEvent] = useState(initialEvent || null);

  // Step 2: Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  // Step 3 & 4: Data Source & Mapping
  const [dataSourceType, setDataSourceType] = useState(initialEvent?.dataSourceType || 'csv'); // 'rest', 'csv', or 'mongo'
  const [parsedFileData, setParsedFileData] = useState(null);
  const [csvMapping, setCsvMapping] = useState(initialEvent?.columnMapping || {
    nameField: '',
    emailField: '',
    recipientIdField: ''
  });
  const [importSummary, setImportSummary] = useState(null);
  const [previewRecords, setPreviewRecords] = useState([]);
  const [selectedPreviewIds, setSelectedPreviewIds] = useState([]);
  const [sourceConfig, setSourceConfig] = useState({
    connector: 'portfolio',
    endpoint: '',
    method: 'GET',
    requestBody: '',
    authMode: 'none',
    authProfile: 'none',
    bearerToken: '',
    apiKeyName: '',
    apiKeyValue: '',
    customHeaders: [],
    queryParams: [],
    pagination: { enabled: false, type: 'page', pageParam: 'page', sizeParam: 'limit', pageSize: 50, maxPages: 5, offsetParam: 'offset' },
    responsePath: '',
    mapping: { idField: '_id', nameField: 'name', emailField: 'email' }
  });
  const [restSourceConfig, setRestSourceConfig] = useState({ portfolioConfigured: false, externalMongoConfigured: false, authProfiles: [{ id: 'none', label: 'No authentication', type: 'none' }] });
  const [restTestState, setRestTestState] = useState(null);
  const [mongoTestState, setMongoTestState] = useState(null);
  const [previewSourceConfig, setPreviewSourceConfig] = useState(null);

  // MongoDB state
  const [mongoDbName, setMongoDbName] = useState('');
  const [mongoCollections, setMongoCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [mongoSampleFields, setMongoSampleFields] = useState([]);
  const [mongoTesting, setMongoTesting] = useState(false);
  const [mongoConnected, setMongoConnected] = useState(false);

  useEffect(() => {
    setPreviewRecords([]);
    setSelectedPreviewIds([]);
    setPreviewSourceConfig(null);
  }, [dataSourceType]);

  // Recipients in event
  const [recipients, setRecipients] = useState([]);

  // Step 5: Generation state
  const [generationResults, setGenerationResults] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [certGenerationMode, setCertGenerationMode] = useState('skip_existing'); // 'skip_existing' | 'regenerate'
  const [validationSummary, setValidationSummary] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);

  // Step 6: Email Sending state
  const [emailConfig, setEmailConfig] = useState({
    subject: 'Congratulations on Your Achievement – {{eventName}} 🎓',
    body: 'Dear {{recipientName}},\n\nWarmest congratulations on your outstanding achievement at {{eventName}}!\n\nYour dedication, hard work, and commendable performance have been truly inspiring. We are deeply honored to celebrate this special milestone with you.\n\nYour official certificate of achievement has been digitally generated and attached to this email. We wish you immense success and brilliant victories in all your future endeavors!\n\nWith heartfelt regards,\n{{organizationName}}',
    senderName: 'PRAMAAN Platform',
    senderEmail: ''
  });
  const [dispatchResults, setDispatchResults] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // Step 7: Delivery Audit & Retry
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [sendingRecipientId, setSendingRecipientId] = useState(null);

  // Live SMTP Configuration status & quick modal
  const [smtpStatus, setSmtpStatus] = useState({ configured: false, settings: null });
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [savingModalSmtp, setSavingModalSmtp] = useState(false);
  const [verifyingModalSmtp, setVerifyingModalSmtp] = useState(false);
  const [modalSmtpError, setModalSmtpError] = useState(null);
  const [modalSmtpSuccess, setModalSmtpSuccess] = useState(null);
  const [smtpModalForm, setSmtpModalForm] = useState({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    senderEmail: '',
    senderName: 'PRAMAAN Platform'
  });

  // Load existing templates on mount
  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await api.getTemplates();
        if (res.success && res.templates) {
          setTemplates(res.templates);
          if (activeEvent?.templateId) {
            const found = res.templates.find(t => t._id === activeEvent.templateId);
            setSelectedTemplate(found || res.templates[0]);
          } else if (res.templates.length > 0) {
            setSelectedTemplate(res.templates[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    }
    loadTemplates();
  }, [activeEvent]);

  useEffect(() => {
    api.getRestSourceConfig().then(setRestSourceConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (dataSourceType !== 'csv' || !parsedFileData?.allRows) return;
    const existingEmails = new Set(recipients.map(recipient => String(recipient.email || '').toLowerCase()));
    const existingIds = new Set(recipients.map(recipient => String(recipient.recipientId || '').trim()).filter(Boolean));
    const seenEmails = new Set();
    const seenIds = new Set();
    const rows = parsedFileData.allRows.map((row, index) => {
      const sourceId = String(index);
      const name = String(row[csvMapping.nameField] || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
      const email = String(row[csvMapping.emailField] || '').trim().toLowerCase().slice(0, 254);
      const recipientId = String(csvMapping.recipientIdField ? row[csvMapping.recipientIdField] || '' : '').trim();
      let error = '';
      if (!name) error = 'Missing recipient name';
      else if (!email) error = 'Missing email address';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) error = 'Invalid email address format';
      let duplicateReason = '';
      if (!error && (existingEmails.has(email) || seenEmails.has(email))) duplicateReason = 'Email already exists in this event or selected file.';
      else if (!error && recipientId && (existingIds.has(recipientId) || seenIds.has(recipientId))) duplicateReason = 'Recipient ID already exists in this event or file.';
      if (email) seenEmails.add(email);
      if (recipientId) seenIds.add(recipientId);
      return { sourceId, recipientId, name, email, valid: !error, error, duplicate: Boolean(duplicateReason), duplicateReason, selectable: !error && !duplicateReason };
    });
    setPreviewRecords(rows);
    setSelectedPreviewIds(rows.filter(row => row.selectable).map(row => row.sourceId));
    setPreviewSourceConfig(null);
  }, [dataSourceType, parsedFileData, csvMapping, recipients]);

  // Load existing recipients when activeEvent is available
  useEffect(() => {
    if (activeEvent?._id) {
      loadEventRecipients();
    }
  }, [activeEvent]);

  // Sync emailConfig when activeEvent changes
  useEffect(() => {
    if (activeEvent?.emailConfig) {
      const savedBody = activeEvent.emailConfig.body;
      const isLegacyBody = !savedBody || savedBody.includes('Thank you for participating') || savedBody.includes('Congratulations on participating');
      setEmailConfig(prev => ({
        ...prev,
        subject: activeEvent.emailConfig.subject || 'Congratulations on Your Achievement – {{eventName}} 🎓',
        body: isLegacyBody ? 'Dear {{recipientName}},\n\nWarmest congratulations on your outstanding achievement at {{eventName}}!\n\nYour dedication, hard work, and commendable performance have been truly inspiring. We are deeply honored to celebrate this special milestone with you.\n\nYour official certificate of achievement has been digitally generated and attached to this email. We wish you immense success and brilliant victories in all your future endeavors!\n\nWith heartfelt regards,\n{{organizationName}}' : savedBody,
        senderName: activeEvent.emailConfig.senderName || prev.senderName,
        senderEmail: activeEvent.emailConfig.senderEmail || prev.senderEmail
      }));
    }
  }, [activeEvent]);

  const loadEventRecipients = async () => {
    if (!activeEvent?._id) return;
    try {
      const res = await api.getRecipients(activeEvent._id);
      if (res.success) {
        setRecipients(res.recipients || []);
      }
    } catch (err) {
      console.error('Failed to fetch recipients:', err);
    }
  };

  const runValidation = async () => {
    if (!activeEvent?._id) return;
    try {
      setIsValidating(true);
      const res = await api.validateCertificates(activeEvent._id);
      if (res.success) {
        setValidationSummary(res);
      }
    } catch (err) {
      console.error('Failed to validate recipients:', err);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (activeEvent?._id && currentStep === 4) {
      runValidation();
    }
  }, [currentStep, activeEvent]);

  const loadDeliveryLogs = async () => {
    if (!activeEvent?._id) return;
    try {
      const res = await api.getEmailLogs(activeEvent._id);
      if (res.success) {
        setDeliveryLogs(res.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch delivery logs:', err);
    }
  };

  const loadSmtpStatus = async () => {
    try {
      const res = await api.getSmtpSettings();
      if (res.success) {
        setSmtpStatus(res);
        if (res.settings && res.settings.host) {
          setSmtpModalForm(prev => ({
            ...prev,
            host: res.settings.host,
            port: res.settings.port || 587,
            secure: !!res.settings.secure,
            user: res.settings.user || '',
            senderEmail: res.settings.senderEmail || res.settings.user || '',
            senderName: res.settings.senderName || 'PRAMAAN Platform'
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch SMTP status in wizard:', err);
    }
  };

  useEffect(() => {
    loadSmtpStatus();
  }, [currentStep]);

  const handleSaveModalSmtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setModalSmtpError(null);
    setModalSmtpSuccess(null);
    if (!smtpModalForm.host || !smtpModalForm.user) {
      setModalSmtpError('SMTP host and complete username/email address are required.');
      return;
    }
    try {
      setSavingModalSmtp(true);
      const res = await api.updateSmtpSettings(smtpModalForm);
      if (res.success) {
        setModalSmtpSuccess('Live SMTP settings saved successfully! Real email delivery is now active.');
        showToast('Live SMTP settings saved! Real deliveries are now active.', 'success');
        await loadSmtpStatus();
        setTimeout(() => setShowSmtpModal(false), 900);
      }
    } catch (err) {
      setModalSmtpError(err.message);
      showToast(err.message, 'error');
    } finally {
      setSavingModalSmtp(false);
    }
  };

  const handleResetModalSmtp = async () => {
    try {
      setSavingModalSmtp(true);
      setModalSmtpError(null);
      setModalSmtpSuccess(null);
      const res = await api.resetSmtpSettings();
      if (res.success) {
        showToast('Switched to Ethereal sandbox test mode.', 'info');
        await loadSmtpStatus();
        setShowSmtpModal(false);
      }
    } catch (err) {
      setModalSmtpError(err.message);
      showToast(err.message, 'error');
    } finally {
      setSavingModalSmtp(false);
    }
  };

  const handleVerifyModalSmtp = async () => {
    setModalSmtpError(null);
    setModalSmtpSuccess(null);
    if (!smtpModalForm.host || !smtpModalForm.user) {
      setModalSmtpError('Please enter SMTP host and complete username/email address.');
      return;
    }
    try {
      setVerifyingModalSmtp(true);
      const res = await api.verifySmtp(smtpModalForm);
      if (res.success) {
        setModalSmtpSuccess('SMTP connection established successfully! Credentials are valid.');
        showToast('SMTP connection established successfully!', 'success');
      }
    } catch (err) {
      setModalSmtpError(err.message);
      showToast(`SMTP verification failed: ${err.message}`, 'error');
    } finally {
      setVerifyingModalSmtp(false);
    }
  };

  // Step 1: Save / Create Event
  const handleSaveEvent = async () => {
    if (!eventData.name.trim()) {
      showToast('Please enter an event name.', 'error');
      return;
    }

    try {
      setLoading(true);
      let ev;
      if (activeEvent?._id) {
        const res = await api.updateEvent(activeEvent._id, {
          ...eventData,
          templateId: selectedTemplate?._id
        });
        ev = res.event;
        showToast('Event details updated successfully.', 'success');
      } else {
        const res = await api.createEvent({
          ...eventData,
          templateId: selectedTemplate?._id
        });
        ev = res.event;
        showToast(`Created event: ${ev.name}`, 'success');
      }

      setActiveEvent(ev);
      setCurrentStep(1);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle Template Selection / Upload
  const handleSelectTemplate = async (template) => {
    setSelectedTemplate(template);
    if (activeEvent?._id) {
      await api.updateEvent(activeEvent._id, { templateId: template._id });
      setActiveEvent(prev => ({ ...prev, templateId: template._id }));
    }
  };

  const handleTemplateFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const uploadRes = await api.uploadTemplateBackground(file);
      if (uploadRes.success) {
        const newTemplateRes = await api.createTemplate({
          name: `${file.name.replace(/\.[^/.]+$/, '')} Template`,
          backgroundPath: uploadRes.filePath,
          backgroundUrl: uploadRes.fileUrl,
          backgroundType: 'image'
        });

        if (newTemplateRes.success) {
          setTemplates(prev => [newTemplateRes.template, ...prev]);
          handleSelectTemplate(newTemplateRes.template);
          showToast('Template uploaded and activated!', 'success');
        }
      }
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle CSV file upload
  const handleCsvFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const res = await api.parseDataFile(file);
      if (res.success) {
        setParsedFileData({ ...res, fileName: file.name });
        setCsvMapping({
          nameField: res.suggestedMapping.nameField || res.headers[0] || '',
          emailField: res.suggestedMapping.emailField || res.headers[1] || '',
          recipientIdField: res.suggestedMapping.recipientIdField || ''
        });
        setPreviewSourceConfig(null);
        showToast(`Parsed ${res.totalRows} records from ${file.name}`, 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Test the backend-configured external MongoDB profile.
  const handleTestMongo = async () => {
    if (!restSourceConfig.externalMongoConfigured) {
      setMongoTestState({ error: 'Configure EXTERNAL_MONGODB_URI in the PRAMAAN backend environment. No database URL is accepted in the browser.' });
      return;
    }
    try {
      setMongoTesting(true);
      const res = await api.testMongoConnection();
      if (res.success) {
        setMongoConnected(true);
        setMongoDbName(res.defaultDatabase || res.databases[0] || 'test');
        setMongoTestState({ message: 'Backend database connection succeeded.' });
        showToast('Connected to authorized MongoDB instance!', 'success');
        const colRes = await api.listMongoCollections(res.defaultDatabase || res.databases[0]);
        if (colRes.success) {
          setMongoCollections(colRes.collections || []);
        }
      }
    } catch (err) {
      setMongoConnected(false);
      setMongoTestState({ error: err.message });
      showToast(`MongoDB connection failed: ${err.message}`, 'error');
    } finally {
      setMongoTesting(false);
    }
  };

  const handleSelectMongoCollection = async (collectionName) => {
    setSelectedCollection(collectionName);
    try {
      const res = await api.sampleMongoData(mongoDbName, collectionName);
      if (res.success) {
        setMongoSampleFields(res.availableFields || []);
        // Auto map
        const fields = res.availableFields;
        const nameF = fields.find(f => /name|student|recipient/i.test(f)) || fields[0] || '';
        const emailF = fields.find(f => /email|mail/i.test(f)) || '';
        const idF = fields.find(f => /id|roll|reg/i.test(f)) || '';

        setCsvMapping({
          nameField: nameF,
          emailField: emailF,
          recipientIdField: idF
        });
      }
    } catch (err) {
      setMongoTestState({ error: err.message });
    }
  };

  const handleRestTest = async () => {
    try {
      setLoading(true);
      setRestTestState(null);
      const result = await api.testRestSource(sourceConfig);
      setRestTestState({ message: `Connected. ${result.total} records found; ${result.validCount} valid.` });
    } catch (err) {
      setRestTestState({ error: err.message });
    } finally { setLoading(false); }
  };

  const handleRestConfigChange = (nextConfig) => {
    setSourceConfig(nextConfig);
    setPreviewSourceConfig(null);
    setPreviewRecords([]);
    setSelectedPreviewIds([]);
  };

  const updateRecipientMapping = (nextMapping) => {
    setCsvMapping(nextMapping);
    if (dataSourceType === 'mongo') {
      setPreviewSourceConfig(null);
      setSelectedPreviewIds([]);
    }
  };

  const handleRestPreview = async () => {
    if (!activeEvent?._id) { showToast('Create or select an event before previewing recipients.', 'error'); return; }
    try {
      setLoading(true);
      const requestConfig = { ...sourceConfig, eventId: activeEvent._id };
      const result = await api.previewRestSource(requestConfig);
      setPreviewRecords(result.records || []);
      setSelectedPreviewIds((result.records || []).filter(row => row.selectable).map(row => row.sourceId));
      setPreviewSourceConfig({ type: 'rest', config: sourceConfig });
      showToast(`Preview loaded: ${result.records?.length || 0} records.`, 'success');
    } catch (err) { setRestTestState({ error: err.message }); }
    finally { setLoading(false); }
  };

  const handleMongoPreview = async () => {
    if (!activeEvent?._id || !selectedCollection || !csvMapping.nameField || !csvMapping.emailField) {
      showToast('Select an event, collection, and recipient name/email mappings first.', 'error'); return;
    }
    try {
      setLoading(true);
      const result = await api.previewMongoSource({ eventId: activeEvent._id, dbName: mongoDbName, collectionName: selectedCollection, mapping: csvMapping });
      setPreviewRecords(result.records || []);
      setSelectedPreviewIds((result.records || []).filter(row => row.selectable).map(row => row.sourceId));
      setPreviewSourceConfig({ type: 'mongo', dbName: mongoDbName, collectionName: selectedCollection, mapping: csvMapping });
    } catch (err) { setMongoTestState({ error: err.message }); }
    finally { setLoading(false); }
  };

  // Step 4: Import Mapped Data with duplicate handling
  const handleExecuteImport = async () => {
    if (!activeEvent?._id) {
      showToast('Please create or select an event first.', 'error');
      return;
    }

    if (dataSourceType !== 'rest' && (!csvMapping.nameField || !csvMapping.emailField)) {
      showToast('Both Name and Email columns must be mapped.', 'error');
      return;
    }

    try {
      setLoading(true);
      if (dataSourceType === 'csv') {
        if (!parsedFileData || !parsedFileData.allRows) {
          showToast('No CSV/Excel data to import.', 'error');
          return;
        }

        const chosenRows = selectedPreviewIds.map(id => parsedFileData.allRows[Number(id)]).filter(Boolean);
        const res = await api.importMappedData(
          activeEvent._id,
          chosenRows,
          csvMapping,
          parsedFileData.fileName || 'Spreadsheet'
        );
        if (res.success) {
          setImportSummary(res);
          await loadEventRecipients();
          showToast(`Import completed: ${res.importedCount} added, ${res.skippedCount} duplicates skipped.`, 'success');
          setCurrentStep(4);
        }
      } else if (dataSourceType === 'rest') {
        if (previewSourceConfig?.type !== 'rest') throw new Error('Load a fresh REST preview before importing.');
        const res = await api.importRestRecipients(activeEvent._id, previewSourceConfig.config, selectedPreviewIds);
        if (res.success) {
          setImportSummary(res);
          await loadEventRecipients();
          showToast(`Import completed: ${res.importedCount} added, ${res.skippedCount} skipped.`, 'success');
          setCurrentStep(4);
        }
      } else if (previewSourceConfig?.type === 'mongo') {
        const res = await api.importMongoRecipients({ ...previewSourceConfig, eventId: activeEvent._id, selectedIds: selectedPreviewIds });

        if (res.success) {
          setImportSummary(res);
          await loadEventRecipients();
          showToast(`Import completed: ${res.importedCount} added, ${res.skippedCount} skipped.`, 'success');
          setCurrentStep(4);
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipient = async (id) => {
    try {
      const res = await api.deleteRecipient(id);
      if (res.success) {
        showToast('Recipient removed from batch.', 'info');
        await loadEventRecipients();
        if (currentStep === 4) {
          runValidation();
        }
      }
    } catch (err) {
      showToast(`Failed to delete recipient: ${err.message}`, 'error');
    }
  };

  // Generate Single Test PDF Preview with Sample or Real Recipient Data
  const handleGenerateTestPdf = async () => {
    if (!selectedTemplate) {
      showToast('Please select a certificate template first.', 'error');
      return;
    }
    try {
      setIsGeneratingTest(true);
      const firstRecipient = recipients.length > 0 ? recipients[0] : null;
      const res = await api.previewSampleCertificate(
        selectedTemplate,
        firstRecipient ? {
          recipientName: firstRecipient.name,
          eventName: activeEvent?.name || 'PRAMAAN Event',
          organizationName: activeEvent?.organizationName || 'PRAMAAN Organization',
          date: activeEvent?.eventDate || new Date().toLocaleDateString(),
          position: firstRecipient.extraData?.position || 'Verified Participant',
          certificateId: `${activeEvent?.certificatePrefix || 'CERT'}-TEST-0001`
        } : null,
        activeEvent?._id || null,
        firstRecipient?.recipientId || null
      );
      if (res.success && res.pdfUrl) {
        window.open(res.pdfUrl, '_blank');
        showToast('Sample test PDF generated and opened in a new tab!', 'success');
      }
    } catch (err) {
      showToast(`Test PDF generation failed: ${err.message}`, 'error');
    } finally {
      setIsGeneratingTest(false);
    }
  };

  // Step 5: Execute Bulk Certificate Generation with Validation & Controlled Duplication
  const handleGenerateBulk = async () => {
    if (!activeEvent?._id) return;
    try {
      setIsGenerating(true);
      const val = await api.validateCertificates(activeEvent._id);
      setValidationSummary(val);

      if (!val.isValid && val.invalidCount > 0) {
        showToast(`Validation failed: ${val.invalidCount} record(s) contain errors. Please fix before generating.`, 'error');
        setIsGenerating(false);
        return;
      }

      const res = await api.generateBulkCertificates(activeEvent._id, { mode: certGenerationMode });
      if (res.success) {
        setGenerationResults(res);
        await loadEventRecipients();
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        if (res.reusedCount > 0) {
          showToast(`Completed: ${res.generatedCount} newly generated, ${res.reusedCount} existing reused!`, 'success');
        } else {
          showToast(`Generated ${res.generatedCount} personalized PDF certificates!`, 'success');
        }
      }
    } catch (err) {
      showToast(`Generation failed: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 6: Dispatch Emails via Nodemailer
  const handleSendEmails = async (forceOption = false) => {
    // Strictly coerce to boolean: if a React Event or HTMLButtonElement was passed, force becomes false
    const forceResend = forceOption === true;
    if (!activeEvent?._id) return;
    try {
      setIsSending(true);

      // Clean emailConfig payload ensuring only serializable plain strings are sent
      const cleanEmailConfig = {
        subject: String(emailConfig.subject || ''),
        body: String(emailConfig.body || ''),
        senderName: String(emailConfig.senderName || ''),
        senderEmail: String(emailConfig.senderEmail || '')
      };
      await api.updateEvent(activeEvent._id, { emailConfig: cleanEmailConfig });

      const res = await api.sendBulkEmails(activeEvent._id, { force: forceResend });
      if (res.success) {
        setDispatchResults(res);
        await loadEventRecipients();
        await loadDeliveryLogs();
        if (res.sentCount > 0) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        if (res.sentCount > 0) {
          showToast(`Sent ${res.sentCount} emails (${res.failedCount} failed)`, 'success');
        } else if (res.totalProcessed === 0) {
          showToast('All recipients were already sent! Click "Re-dispatch All" to resend.', 'info');
        } else {
          showToast(`Completed: ${res.sentCount} sent, ${res.failedCount} failed`, res.failedCount > 0 ? 'warning' : 'success');
        }
        setCurrentStep(6);
      }
    } catch (err) {
      showToast(`Email dispatch error: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Step 7: Retry Failed Deliveries
  const handleRetryFailed = async () => {
    if (!activeEvent?._id) return;
    try {
      setIsRetrying(true);
      const res = await api.retryFailedEmails(activeEvent._id);
      if (res.success) {
        if (res.totalRetried === 0) {
          showToast('No failed deliveries found to retry. All recipients are currently marked as sent.', 'info');
        } else {
          showToast(`Retried ${res.totalRetried} deliveries: ${res.successfulRetries} succeeded, ${res.failedRetries} failed.`, res.failedRetries > 0 ? 'warning' : 'success');
        }
        await loadEventRecipients();
        await loadDeliveryLogs();
      }
    } catch (err) {
      showToast(`Retry error: ${err.message}`, 'error');
    } finally {
      setIsRetrying(false);
    }
  };

  // Step 7: Send or resend single recipient email directly
  const handleSendSingleRecipient = async (recParam) => {
    // Safely extract primitive string ID, NEVER pass Event/DOM element
    const recipientId = typeof recParam === 'string'
      ? recParam
      : (recParam && typeof recParam === 'object' ? (recParam._id || recParam.recipientId) : null);
    if (!recipientId) return;

    try {
      setSendingRecipientId(recipientId);
      const res = await api.sendRecipientEmail(recipientId);
      if (res.success) {
        showToast(`Email dispatched to ${res.email}! ${res.isTest ? '(Test Sandbox Preview Available)' : '(Delivered to Real Inbox)'}`, 'success');
        await loadEventRecipients();
        await loadDeliveryLogs();
      }
    } catch (err) {
      showToast(`Send failed: ${err.message}`, 'error');
      await loadEventRecipients();
    } finally {
      setSendingRecipientId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Stepper Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#121215] via-[#151518] to-[#121215] border border-[#27272a] shadow-2xl glowing-border">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ca0019]/15 text-[#ef4444] text-[10px] uppercase font-extrabold tracking-wider border border-[#ca0019]/30 mb-1.5">
              <Sparkles className="w-3 h-3" />
              Workflow Pipeline
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 font-display">
              End-to-End Batch Automation Wizard
            </h1>
            <p className="text-xs text-gray-400 mt-1 font-sans">
              Complete configuration-driven workflow from template design to verifiable Nodemailer delivery.
            </p>
          </div>
          {activeEvent && (
            <Badge variant="success" size="sm" dot>
              Batch: {activeEvent.name}
            </Badge>
          )}
        </div>

        <Stepper
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onStepClick={(idx) => {
            // Allow clicking previous steps or any valid step based on state
            if (idx <= currentStep) {
              setCurrentStep(idx);
            } else if (idx === 1 && activeEvent) {
              setCurrentStep(idx);
            } else if (idx === 2 && activeEvent && selectedTemplate) {
              setCurrentStep(idx);
            } else if (idx === 3 && activeEvent && (parsedFileData || previewSourceConfig || recipients.length > 0 || mongoConnected)) {
              setCurrentStep(idx);
            } else if (idx === 4 && activeEvent && recipients.length > 0) {
              setCurrentStep(idx);
            } else if (idx === 5 && activeEvent && recipients.some(r => r.certificate)) {
              setCurrentStep(idx);
            } else if (idx === 6 && activeEvent && (deliveryLogs.length > 0 || recipients.some(r => r.delivery))) {
              setCurrentStep(idx);
            }
          }}
        />
      </div>

      {/* Step Content Container */}
      <div className="min-h-[460px]">
        {/* STEP 1: EVENT SETUP */}
        {currentStep === 0 && (
          <Card className="max-w-3xl mx-auto space-y-6 animate-slideUp">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#ca0019]" />
                Step 1: Event & Batch Specification
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Configure your event metadata. PRAMAAN is configuration-driven and reusable for any future workshop, hackathon, or program.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Event / Batch Name <span className="text-[#ca0019]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BHU Tech 2026, IdeaJam Hackathon, Python Workshop"
                  value={eventData.name}
                  onChange={(e) => setEventData({ ...eventData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181b26] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#ca0019]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                    Issuing Organization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. The Uniques Community"
                    value={eventData.organizationName}
                    onChange={(e) => setEventData({ ...eventData, organizationName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#181b26] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#ca0019]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                    Event / Issuance Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. October 15, 2026"
                    value={eventData.eventDate}
                    onChange={(e) => setEventData({ ...eventData, eventDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#181b26] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#ca0019]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                    Certificate ID Prefix
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IJ26, TECH, CERT"
                    value={eventData.certificatePrefix}
                    onChange={(e) => setEventData({ ...eventData, certificatePrefix: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#181b26] border border-white/10 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[#ca0019]"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Will generate collision-safe IDs like <code className="text-gray-300">{eventData.certificatePrefix || 'CERT'}-2026-0001</code>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                    Optional Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Annual technical showcase and hackathon"
                    value={eventData.description}
                    onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#181b26] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#ca0019]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <Button
                variant="primary"
                onClick={handleSaveEvent}
                loading={loading}
                icon={ArrowRight}
              >
                Proceed to Template Studio
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 2: TEMPLATE SELECTION & VISUAL FIELD EDITOR */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-slideUp">
            {!showEditor ? (
              <Card className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <LayoutTemplate className="w-5 h-5 text-[#ca0019]" />
                      Step 2: Certificate Template Selection
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Select a pre-designed certificate background or upload your own Canva/Figma/Photoshop export (PNG, JPG, PDF).
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf"
                        onChange={handleTemplateFileUpload}
                        className="hidden"
                      />
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#181b26] text-white hover:bg-[#222736] border border-white/15 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4 text-[#ff4d64]" />
                        Upload Custom Background
                      </span>
                    </label>

                    {selectedTemplate && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleGenerateTestPdf}
                          loading={isGeneratingTest}
                          icon={Eye}
                        >
                          Generate Test PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowEditor(true)}
                          icon={Sparkles}
                        >
                          Launch Visual Field Studio
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((tpl) => {
                    const isSelected = selectedTemplate?._id === tpl._id;
                    return (
                      <div
                        key={tpl._id}
                        onClick={() => handleSelectTemplate(tpl)}
                        className={`
                          p-4 rounded-xl border transition-all duration-200 cursor-pointer relative group flex flex-col justify-between
                          ${isSelected
                            ? 'bg-[#181b26] border-[#ca0019] shadow-glow-crimson ring-1 ring-[#ca0019]'
                            : 'bg-[#12141c] border-white/10 hover:border-white/20 hover:bg-[#161822]'
                          }
                        `}
                      >
                        <div className="aspect-[842/595] rounded-lg overflow-hidden bg-white/5 border border-white/10 mb-3 relative flex items-center justify-center">
                          {tpl.backgroundUrl ? (
                            <img src={tpl.backgroundUrl} alt={tpl.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full p-2 flex flex-col justify-between bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800 text-center text-[10px] font-serif border border-slate-300">
                              <div className="border border-[#ca0019] h-full p-2 flex flex-col justify-between">
                                <span className="font-bold text-[#ca0019] uppercase tracking-wider">{tpl.name}</span>
                                <span className="text-[9px] text-slate-600 italic">Certificate Preview</span>
                              </div>
                            </div>
                          )}

                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#ca0019] flex items-center justify-center text-white shadow-lg">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-bold text-white">{tpl.name}</h4>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {tpl.fields?.length || 0} fields
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 line-clamp-2">
                            {tpl.description || 'Pre-designed dynamic certificate template'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <Button variant="outline" onClick={() => setCurrentStep(0)} icon={ArrowLeft}>
                    Back to Event
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!selectedTemplate}
                    onClick={() => setCurrentStep(2)}
                    icon={ArrowRight}
                  >
                    Proceed to Data Source
                  </Button>
                </div>
              </Card>
            ) : (
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowEditor(false)}
                  className="mb-4"
                  icon={ArrowLeft}
                >
                  Exit Visual Studio & Return to Wizard
                </Button>
                <CertificateVisualEditor
                  template={selectedTemplate}
                  onSave={async (updated) => {
                    const res = await api.updateTemplate(updated._id, updated);
                    if (res.success) {
                      setSelectedTemplate(res.template);
                      setTemplates(prev => prev.map(t => t._id === res.template._id ? res.template : t));
                      showToast('Saved template configuration!', 'success');
                      setShowEditor(false);
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 3: CONNECT DATA SOURCE */}
        {currentStep === 2 && (
          <Card className="max-w-3xl mx-auto space-y-6 animate-slideUp">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-[#ca0019]" />
                Step 3: Connect Data Source
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Choose an API, spreadsheet, or separately configured database source. Credentials stay on the backend.
              </p>
            </div>

            {/* Source Type Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button type="button" onClick={() => setDataSourceType('rest')} className={`p-5 rounded-xl border text-left transition-all space-y-2 ${dataSourceType === 'rest' ? 'bg-[#181b26] border-[#ca0019] ring-1 ring-[#ca0019]' : 'bg-[#12141c] border-white/10 hover:border-white/20'}`}>
                <Globe2 className="h-8 w-8 text-sky-300" /><h3 className="text-sm font-bold text-white">REST API</h3><p className="text-xs text-gray-400">Connect to a compatible JSON endpoint.</p>
              </button>
              <div
                role="button" tabIndex={0} onKeyDown={event => event.key === 'Enter' && setDataSourceType('csv')} onClick={() => setDataSourceType('csv')}
                className={`
                  p-5 rounded-xl border transition-all duration-200 cursor-pointer space-y-2
                  ${dataSourceType === 'csv'
                    ? 'bg-[#181b26] border-[#ca0019] shadow-glow-crimson ring-1 ring-[#ca0019]'
                    : 'bg-[#12141c] border-white/10 hover:border-white/20'
                  }
                `}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Excel / CSV Spreadsheet</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Upload .csv, .xlsx, or .xls file. Auto-detect headers and map any column layout.
                </p>
              </div>

              <div
                role="button" tabIndex={0} onKeyDown={event => event.key === 'Enter' && setDataSourceType('mongo')} onClick={() => setDataSourceType('mongo')}
                className={`
                  p-5 rounded-xl border transition-all duration-200 cursor-pointer space-y-2
                  ${dataSourceType === 'mongo'
                    ? 'bg-[#181b26] border-[#ca0019] shadow-glow-crimson ring-1 ring-[#ca0019]'
                    : 'bg-[#12141c] border-white/10 hover:border-white/20'
                  }
                `}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Direct Database</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Uses an external MongoDB profile configured on the backend.
                </p>
              </div>
            </div>

            {dataSourceType === 'rest' && <RestApiConnector config={sourceConfig} onChange={handleRestConfigChange} profiles={restSourceConfig.authProfiles} portfolioConfigured={restSourceConfig.portfolioConfigured} portfolioApiUrl={restSourceConfig.portfolioApiUrl} onTest={handleRestTest} onPreview={handleRestPreview} loading={loading} testState={restTestState} />}

            {/* CSV / Excel workflow */}
            {dataSourceType === 'csv' && (
              <div className="p-6 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
                <div className="border-2 border-dashed border-[#3f3f46] hover:border-[#ca0019] rounded-2xl p-10 text-center transition-all bg-[#18181b]/50 group">
                  <div className="w-14 h-14 rounded-2xl bg-[#ca0019]/15 border border-[#ca0019]/30 mx-auto flex items-center justify-center text-[#ef4444] mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-extrabold text-white mb-1 font-display">
                    Upload Recipient Excel or CSV File
                  </h4>
                  <p className="text-xs text-gray-400 mb-5 font-sans">
                    Drag and drop file here or click to browse. Supports .csv, .xlsx, .xls formats with unlimited rows.
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleCsvFileUpload}
                      className="hidden"
                    />
                    <span className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#ca0019] hover:bg-[#b91c1c] text-white shadow-lg shadow-[#ca0019]/40 transition-all inline-flex items-center gap-2 hover:-translate-y-0.5">
                      <FileSpreadsheet className="w-4 h-4" />
                      Browse Spreadsheet File
                    </span>
                  </label>
                </div>

                {parsedFileData && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Loaded <strong>{parsedFileData.totalRows}</strong> rows across {parsedFileData.headers?.length} detected columns
                    </span>
                    <Badge variant="success">Parsed</Badge>
                  </div>
                )}

                {!parsedFileData && recipients.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      <span>
                        <strong>Existing Batch Data Active:</strong> <strong>{recipients.length}</strong> recipients are already linked to this event. New imports only add selected recipients and skip duplicates.
                      </span>
                    </span>
                    <Badge variant="info">{recipients.length} Loaded</Badge>
                  </div>
                )}
              </div>
            )}

            {/* Direct database workflow. Credentials never enter the browser. */}
            {dataSourceType === 'mongo' && (
              <DatabaseConnector configured={restSourceConfig.externalMongoConfigured} connected={mongoConnected} dbName={mongoDbName} collections={mongoCollections} collectionName={selectedCollection} fields={mongoSampleFields} onConnect={handleTestMongo} onDbChange={setMongoDbName} onCollectionChange={handleSelectMongoCollection} onPreview={handleMongoPreview} loading={mongoTesting || loading} testState={mongoTestState} />
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setCurrentStep(1)} icon={ArrowLeft}>
                Back to Template
              </Button>
              <Button
                variant="primary"
                disabled={dataSourceType === 'csv' ? (!parsedFileData && recipients.length === 0) : (!previewSourceConfig && recipients.length === 0)}
                onClick={() => setCurrentStep(3)}
                icon={ArrowRight}
              >
                Proceed to Mapping & Preview
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 4: DYNAMIC FIELD MAPPING & VALIDATION */}
        {currentStep === 3 && (
          <Card className="max-w-4xl mx-auto space-y-6 animate-slideUp">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#ca0019]" />
                Step 4: Dynamic Column Mapping & Recipient Validation
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Map raw columns from your data source to PRAMAAN fields. Exact recipient identity is strictly maintained.
              </p>
            </div>

            {/* Existing Batch Data Banner if already loaded */}
            {dataSourceType === 'csv' && !parsedFileData && recipients.length > 0 && (
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span>
                    <strong>Existing Recipient Records Active:</strong> <strong>{recipients.length}</strong> recipients are currently saved in this batch. New imports add selected recipients only; existing records are preserved.
                  </span>
                </div>
                <Badge variant="info">{recipients.length} Records</Badge>
              </div>
            )}

            {/* Column Mapping Inputs */}
            {dataSourceType !== 'rest' && <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-[#161822] border border-white/10">
              {/* Name Field */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Recipient Name Column <span className="text-[#ca0019]">*</span>
                </label>
                <select
                  value={csvMapping.nameField}
                  onChange={(e) => updateRecipientMapping({ ...csvMapping, nameField: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#181b26] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ca0019]"
                >
                  <option value="">-- Choose Column --</option>
                  {(dataSourceType === 'csv'
                    ? (parsedFileData?.headers || (csvMapping.nameField ? [csvMapping.nameField] : []))
                    : mongoSampleFields
                  )?.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Email Field */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Email Address Column <span className="text-[#ca0019]">*</span>
                </label>
                <select
                  value={csvMapping.emailField}
                  onChange={(e) => updateRecipientMapping({ ...csvMapping, emailField: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#181b26] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ca0019]"
                >
                  <option value="">-- Choose Column --</option>
                  {(dataSourceType === 'csv'
                    ? (parsedFileData?.headers || (csvMapping.emailField ? [csvMapping.emailField] : []))
                    : mongoSampleFields
                  )?.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Unique ID Field */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Unique Recipient ID (Optional)
                </label>
                <select
                  value={csvMapping.recipientIdField}
                  onChange={(e) => updateRecipientMapping({ ...csvMapping, recipientIdField: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#181b26] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ca0019]"
                >
                  <option value="">Auto-generate unique ID</option>
                  {(dataSourceType === 'csv'
                    ? (parsedFileData?.headers || (csvMapping.recipientIdField ? [csvMapping.recipientIdField] : []))
                    : mongoSampleFields
                  )?.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>}

            {/* Source Data Preview Table (when file parsed) */}
            {dataSourceType === 'csv' && parsedFileData?.previewRows && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Source Data Preview (First 5 Rows)
                </span>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d0f15]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#141620] text-gray-400 border-b border-white/10">
                      <tr>
                        {parsedFileData.headers.map(h => (
                          <th key={h} className="p-3 font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {parsedFileData.previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          {parsedFileData.headers.map(h => (
                            <td key={h} className="p-3 whitespace-nowrap">{String(row[h] || '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(dataSourceType === 'csv' && parsedFileData) || previewSourceConfig ? (
              <div className="space-y-3">
                <div><h3 className="text-sm font-bold text-white">Review and select recipients</h3><p className="mt-1 text-xs text-gray-400">Only selected, valid, nonduplicate recipients will be added. This does not generate or email certificates.</p></div>
                <RecipientImportPreview records={previewRecords} selectedIds={selectedPreviewIds} onSelectionChange={setSelectedPreviewIds} onConfirm={handleExecuteImport} loading={loading} confirmLabel={`Confirm import (${selectedPreviewIds.length})`} />
              </div>
            ) : null}

            {/* Existing Batch Data Preview Table (when reopening without file upload) */}
            {dataSourceType === 'csv' && !parsedFileData && recipients.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Existing Batch Recipients (Showing First 5 of {recipients.length})
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    Duplicate names with unique emails/IDs preserved
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d0f15]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#141620] text-gray-400 border-b border-white/10">
                      <tr>
                        <th className="p-3">Recipient Name</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Recipient ID</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {recipients.slice(0, 10).map((r) => (
                        <tr key={r._id} className="hover:bg-white/5">
                          <td className="p-3 font-semibold text-white">{r.name}</td>
                          <td className="p-3 font-mono text-[#ff4d64]">{r.email}</td>
                          <td className="p-3 font-mono text-gray-400">{r.recipientId || '—'}</td>
                          <td className="p-3">
                            <Badge variant={r.status === 'invalid' ? 'danger' : (r.certificate ? 'success' : 'info')}>
                              {r.status === 'invalid' ? 'Invalid Data' : (r.certificate ? 'Certificate Ready' : 'Pending Generation')}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRecipient(r._id)}
                              className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
                              title="Remove this recipient from batch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setCurrentStep(2)} icon={ArrowLeft}>
                Back to Source
              </Button>
              {(dataSourceType === 'csv' && parsedFileData) || previewSourceConfig ? (
                <span className="text-xs text-gray-400">Use the confirmation control above to add the selected recipients.</span>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => setCurrentStep(4)}
                  icon={ArrowRight}
                >
                  Proceed to PDF Generation
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* STEP 5: CERTIFICATE GENERATION */}
        {currentStep === 4 && (
          <Card glowingTop className="max-w-3xl mx-auto space-y-6 animate-slideUp border-[#27272a] bg-[#121215]">
            <div className="border-b border-[#27272a] pb-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
                <Download className="w-5 h-5 text-[#ca0019]" />
                Step 5: Personalized PDF Certificate Generation
              </h2>
              <p className="text-xs text-gray-400 mt-1 font-sans">
                Combine valid recipient data with the selected certificate template. Each PDF is collision-safe and strictly bound to its recipient ID.
              </p>
            </div>

            {importSummary && (
              <div className="space-y-2 rounded-xl border border-white/10 bg-[#161822] p-4 text-xs">
                <div className="font-bold text-white">Recipient import report</div>
                <div className="text-gray-300">{importSummary.importedCount ?? importSummary.newCount ?? 0} added · {importSummary.skippedCount ?? 0} skipped · {importSummary.invalidCount ?? 0} invalid</div>
                {(importSummary.skipped || importSummary.duplicates || []).length > 0 && (
                  <div className="max-h-36 space-y-1 overflow-y-auto border-t border-white/10 pt-2 text-amber-200">
                    <div className="font-semibold">Skipped records</div>
                    {(importSummary.skipped || importSummary.duplicates || []).slice(0, 50).map((record, index) => (
                      <div key={`${record.sourceId || record.rowNumber || 'skip'}-${index}`}>
                        {record.name || record.email || record.sourceId || `Row ${record.rowNumber || index + 1}`}{record.email && record.name ? ` (${record.email})` : ''}: {record.reason || 'Duplicate skipped'}
                      </div>
                    ))}
                    {(importSummary.skipped || importSummary.duplicates || []).length > 50 && <div>Showing first 50 skipped records.</div>}
                  </div>
                )}
                {(importSummary.invalidRecords || []).length > 0 && <div className="border-t border-white/10 pt-2 text-rose-200">{importSummary.invalidRecords.length} invalid selected rows were excluded from the import.</div>}
              </div>
            )}

            {/* Summary card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a]">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Recipients</span>
                <div className="text-3xl font-extrabold text-white mt-1 font-display">{recipients.length}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a]">
                <span className="text-[10px] uppercase font-bold text-gray-400">Assigned Template</span>
                <div className="text-sm font-extrabold text-[#ef4444] mt-2 truncate font-display">
                  {selectedTemplate?.name || 'Default Template'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a]">
                <span className="text-[10px] uppercase font-bold text-gray-400">ID Prefix</span>
                <div className="text-base font-bold font-mono text-white mt-2">
                  {activeEvent?.certificatePrefix || 'CERT'}-2026-XXXX
                </div>
              </div>
            </div>

            {/* Pre-Generation Validation Box */}
            {validationSummary && (
              <div className={`p-4 rounded-xl border text-xs space-y-3 ${
                validationSummary.isValid && validationSummary.invalidCount === 0
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                  : 'bg-red-500/10 border-red-500/25 text-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {validationSummary.isValid && validationSummary.invalidCount === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-sm block">
                        {validationSummary.isValid && validationSummary.invalidCount === 0
                          ? 'All Recipient Records Validated & Ready for Generation'
                          : `Pre-Generation Validation Warning: ${validationSummary.invalidCount} Invalid Record(s)`
                        }
                      </span>
                      <span className="text-[11px] opacity-80">
                        Total: {validationSummary.totalCount || validationSummary.totalRecipients} | Valid: {validationSummary.validCount} | Invalid: {validationSummary.invalidCount}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={runValidation}
                    loading={isValidating}
                    icon={RotateCw}
                  >
                    Re-validate Records
                  </Button>
                </div>

                {/* Validation Warnings (Non-blocking notices) */}
                {validationSummary.warnings && validationSummary.warnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 max-h-36 overflow-y-auto space-y-1 font-mono text-[11px]">
                    <div className="font-semibold text-amber-300 mb-0.5">Notices (generation allowed):</div>
                    {validationSummary.warnings.map((w, idx) => (
                      <div key={idx} className="text-amber-200 flex items-start gap-2">
                        <span className="text-amber-400 shrink-0">Row {w.rowNumber || idx + 1}:</span>
                        <span>{w.name ? `${w.name}: ` : ''}{w.warning}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Validation Errors (Blocking) */}
                {validationSummary.invalidCount > 0 && validationSummary.errors?.length > 0 && (
                  <div className="p-3 rounded-lg bg-black/40 border border-red-500/30 max-h-40 overflow-y-auto space-y-1 font-mono text-[11px]">
                    <div className="font-semibold text-red-300 mb-1">
                      Validation failed. {validationSummary.invalidCount} record(s) contain errors (generation blocked):
                    </div>
                    {validationSummary.errors.map((err, idx) => (
                      <div key={idx} className="text-red-200 flex items-start gap-2">
                        <span className="text-red-400 shrink-0">Row {err.rowNumber || err.row || idx + 1}:</span>
                        <span>{err.name ? `${err.name}: ` : ''}{err.error || err.issues?.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Test Sample PDF Preview Before Bulk Generation */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#161822] border border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#ff4d64]" />
                <span className="text-gray-300">
                  Preview personalized certificate with 1st recipient before bulk generation:
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateTestPdf}
                loading={isGeneratingTest}
                icon={Eye}
              >
                Generate Test PDF (Preview)
              </Button>
            </div>

            {/* Controlled Duplicate Certificate Protection Options */}
            <div className="p-4 rounded-xl bg-[#161822] border border-white/10 space-y-2">
              <label className="text-xs font-semibold text-gray-300 block">
                Certificate Generation & Duplicate Protection Strategy
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                  certGenerationMode === 'skip_existing'
                    ? 'bg-[#1e141a] border-[#ca0019] text-white'
                    : 'bg-[#12141c] border-white/10 text-gray-400 hover:text-white'
                }`}>
                  <input
                    type="radio"
                    name="certGenMode"
                    value="skip_existing"
                    checked={certGenerationMode === 'skip_existing'}
                    onChange={() => setCertGenerationMode('skip_existing')}
                    className="mt-0.5 accent-[#ca0019]"
                  />
                  <div>
                    <div className="font-bold">Skip Existing Valid Certificates (Recommended)</div>
                    <div className="text-[11px] opacity-75">
                      Reuses already generated PDF certificates. No duplicate certificate IDs are generated. Safe for reruns and email retries.
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                  certGenerationMode === 'regenerate'
                    ? 'bg-[#1e141a] border-[#ca0019] text-white'
                    : 'bg-[#12141c] border-white/10 text-gray-400 hover:text-white'
                }`}>
                  <input
                    type="radio"
                    name="certGenMode"
                    value="regenerate"
                    checked={certGenerationMode === 'regenerate'}
                    onChange={() => setCertGenerationMode('regenerate')}
                    className="mt-0.5 accent-[#ca0019]"
                  />
                  <div>
                    <div className="font-bold">Regenerate All Certificates</div>
                    <div className="text-[11px] opacity-75">
                      Forces complete re-rendering of all certificate PDFs with fresh vector layout.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Generation Action */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-[#161822] to-[#1e141a] border border-[#ca0019]/20 text-center space-y-4">
              <h3 className="text-base font-bold text-white">Ready for High-Speed Bulk Generation</h3>
              <p className="text-xs text-gray-400 max-w-lg mx-auto">
                Personalized fields (Recipient Name, Event Name, Date, ID, Organization) will be embedded into vector PDF files with collision-safe naming.
              </p>
              <Button
                variant="accent"
                size="lg"
                onClick={handleGenerateBulk}
                loading={isGenerating}
                disabled={recipients.length === 0 || (validationSummary && validationSummary.invalidCount > 0)}
                icon={Download}
              >
                {isGenerating ? 'Generating Certificates...' : `Generate ${recipients.length} Personalized Certificates`}
              </Button>
              {validationSummary && validationSummary.invalidCount > 0 && (
                <p className="text-xs text-red-400">
                  Bulk generation is blocked while {validationSummary.invalidCount} invalid recipient record(s) exist. Correct data before generating.
                </p>
              )}
            </div>

            {/* Generated results preview */}
            {generationResults && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Successfully generated {generationResults.generatedCount} PDF certificates!
                  </span>
                  <Badge variant="success">Ready for Dispatch</Badge>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {generationResults.certificates?.slice(0, 3).map((c) => (
                    <a
                      key={c.certificateId}
                      href={c.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded bg-[#181b26] text-white hover:text-[#ff4d64] border border-white/10 flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>{c.name} ({c.certificateId})</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setCurrentStep(3)} icon={ArrowLeft}>
                Back to Mapping
              </Button>
              <Button
                variant="primary"
                onClick={() => setCurrentStep(5)}
                icon={ArrowRight}
              >
                Proceed to Email Dispatch
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 6: EMAIL DISPATCH VIA NODEMAILER */}
        {currentStep === 5 && (
          <Card glowingTop className="max-w-3xl mx-auto space-y-6 animate-slideUp border-[#27272a] bg-[#121215]">
            <div className="border-b border-[#27272a] pb-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
                <Send className="w-5 h-5 text-[#ca0019]" />
                Step 6: Automated Email Dispatch via Nodemailer
              </h2>
              <p className="text-xs text-gray-400 mt-1 font-sans">
                Customize your email content. The exact generated PDF is automatically attached to each recipient's email.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={emailConfig.subject}
                  onChange={(e) => setEmailConfig({ ...emailConfig, subject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181b26] border border-white/10 text-white focus:outline-none focus:border-[#ca0019]"
                />
                <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                  Supported tokens: &#123;&#123;eventName&#125;&#125;, &#123;&#123;recipientName&#125;&#125;, &#123;&#123;certificateId&#125;&#125;
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Email Body Content
                </label>
                <textarea
                  rows={4}
                  value={emailConfig.body}
                  onChange={(e) => setEmailConfig({ ...emailConfig, body: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181b26] border border-white/10 text-white focus:outline-none focus:border-[#ca0019]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={emailConfig.senderName}
                    onChange={(e) => setEmailConfig({ ...emailConfig, senderName: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-[#181b26] border border-white/10 text-white focus:outline-none focus:border-[#ca0019]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Sender Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. certifications@theuniques.in"
                    value={emailConfig.senderEmail}
                    onChange={(e) => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-[#181b26] border border-white/10 text-white focus:outline-none focus:border-[#ca0019]"
                  />
                </div>
              </div>

              {/* SMTP Transport Relay Status */}
              <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${smtpStatus.configured ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${smtpStatus.configured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2">
                      <span>{smtpStatus.configured ? 'Live SMTP Configured' : 'Ethereal Test Sandbox Active'}</span>
                      <Badge variant={smtpStatus.configured ? 'success' : 'warning'}>
                        {smtpStatus.configured ? 'Real Delivery' : 'Simulated Delivery'}
                      </Badge>
                    </div>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {smtpStatus.configured
                        ? `Certificates will be delivered directly to real inboxes via ${smtpStatus.settings?.host} (${smtpStatus.settings?.senderEmail || smtpStatus.settings?.user}).`
                        : 'Unconfigured SMTP defaults to Ethereal sandbox test previews. To deliver emails directly to participants\' real inboxes, configure live SMTP credentials.'
                      }
                    </p>
                  </div>
                </div>

                <Button
                  size="xs"
                  variant={smtpStatus.configured ? 'outline' : 'primary'}
                  onClick={() => setShowSmtpModal(true)}
                  icon={Settings}
                >
                  {smtpStatus.configured ? 'Edit SMTP' : 'Configure Live SMTP'}
                </Button>
              </div>
            </div>

            {/* Target Recipients Email Dispatch Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#ca0019]" />
                  Target Recipients & Delivery Emails ({recipients.length} Users)
                </span>
                <span className="text-[11px] text-gray-400">
                  Exact 1-to-1 Email Mapping
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d0f15] max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141620] text-gray-400 border-b border-white/10 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">Recipient Name</th>
                      <th className="p-3">Target Email Address</th>
                      <th className="p-3">Recipient ID</th>
                      <th className="p-3">Certificate ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {recipients.map((r) => (
                      <tr key={r._id} className="hover:bg-white/5">
                        <td className="p-3 font-semibold text-white">{r.name}</td>
                        <td className="p-3 font-mono font-medium text-[#ff4d64] bg-[#ca0019]/5">
                          {r.email}
                        </td>
                        <td className="p-3 font-mono text-gray-500">{r.recipientId}</td>
                        <td className="p-3 font-mono text-gray-300">
                          {r.certificate?.certificateId || 'Ready'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-[#171022] via-[#1f1630] to-[#120d1c] border border-[#d4af37]/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#fbf9f5] flex items-center gap-2">
                  <span className="text-amber-400">✦</span>
                  Royal Purple, Lavender & Gold Luxury Email Theme
                </span>
                <span className="text-[11px] text-[#c4b5fd] block mt-0.5">
                  Delivered as a premium branded email with warm congratulatory greetings and the official vector certificate attached directly as a PDF (no OTP, no external download links).
                </span>
              </div>
              <Badge variant="purple">Direct PDF</Badge>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setCurrentStep(4)} icon={ArrowLeft}>
                Back to Generation
              </Button>
              <Button
                variant="accent"
                onClick={() => handleSendEmails(false)}
                loading={isSending}
                icon={Send}
              >
                {isSending ? 'Sending Dispatch...' : `Dispatch to ${recipients.length} Recipient Emails`}
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 7: DELIVERY AUDIT & RETRY */}
        {currentStep === 6 && (() => {
          const failedCount = recipients.filter(r => (r.delivery?.status || r.status) === 'failed').length;
          const sentCount = recipients.filter(r => (r.delivery?.status || r.status) === 'sent').length;

          return (
            <Card glowingTop className="max-w-5xl mx-auto space-y-6 animate-slideUp border-[#27272a] bg-[#121215]">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27272a] pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Step 7: Delivery Audit & Certificate Tracking
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-sans">
                    Track delivery states (Sent / Failed / Pending) and verify when each user views their given certificate online.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {failedCount > 0 ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRetryFailed()}
                      loading={isRetrying}
                      icon={RotateCw}
                    >
                      Retry {failedCount} Failed Deliveries
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        All {sentCount} Dispatched
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSendEmails(true)}
                        loading={isSending}
                        icon={RotateCw}
                        title="Force resend all certificates to participants"
                      >
                        Re-dispatch All Emails
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* SMTP Mode Notice Banner in Step 7 */}
              <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${smtpStatus.configured ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'}`}>
                <div className="flex items-center gap-3">
                  <Info className="w-4 h-4 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold block">
                      {smtpStatus.configured ? 'Live SMTP Relay Active' : 'Sandbox Test Mode Active (Mock Ethereal Server)'}
                    </span>
                    <p className="opacity-80 mt-0.5">
                      {smtpStatus.configured
                        ? `Live emails dispatched via ${smtpStatus.settings?.host} (${smtpStatus.settings?.senderEmail || smtpStatus.settings?.user}) directly to participants' inboxes.`
                        : 'Emails were simulated via Ethereal sandbox test previews. To deliver emails directly to participants\' real Gmail/Outlook inboxes, configure your SMTP server.'
                      }
                    </p>
                  </div>
                </div>
                <Button
                  size="xs"
                  variant={smtpStatus.configured ? 'outline' : 'primary'}
                  onClick={() => setShowSmtpModal(true)}
                  icon={Settings}
                >
                  {smtpStatus.configured ? 'Edit SMTP' : 'Switch to Live SMTP Delivery'}
                </Button>
              </div>

              {/* Test Mode Preview Notice if using Ethereal */}
              {dispatchResults?.sent?.some(s => s.previewUrl) && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs space-y-2">
                  <span className="font-bold block">Test Mode Email Previews (Simulated Sandbox):</span>
                  <div className="flex flex-wrap gap-2">
                    {dispatchResults.sent.map((s, idx) => s.previewUrl ? (
                      <a
                        key={idx}
                        href={s.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/40 border border-blue-400/30 text-blue-200 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Mail for {s.name} ({s.email})
                      </a>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* Recipients Audit Table */}
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d0f15]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141620] text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Recipient Name</th>
                      <th className="p-3">Recipient Email</th>
                      <th className="p-3">Certificate ID</th>
                      <th className="p-3">Delivery Status</th>
                      <th className="p-3">Certificate Viewed</th>
                      <th className="p-3 text-right">Certificate & Mail Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {recipients.map((r) => {
                      const cert = r.certificate;
                      const delivery = r.delivery;
                      const status = delivery?.status || r.status || 'pending';
                      const isViewed = cert?.isViewed || delivery?.isViewed;
                      const viewedAt = cert?.viewedAt || delivery?.viewedAt;

                      return (
                        <tr key={r._id} className="hover:bg-white/5">
                          <td className="p-3 font-semibold text-white">{r.name}</td>
                          <td className="p-3 font-mono font-medium text-[#ff4d64]">{r.email}</td>
                          <td className="p-3 font-mono text-gray-300 font-bold">
                            {cert?.certificateId || '—'}
                          </td>
                          <td className="p-3">
                            {status === 'sent' && (
                              <div>
                                <Badge variant={delivery?.isTest ? 'info' : 'success'}>
                                  {delivery?.isTest ? 'Sent (Sandbox)' : 'Sent (Live)'}
                                </Badge>
                                {delivery?.isTest && (
                                  <span className="block text-[10px] text-gray-500 mt-0.5">Test mode preview</span>
                                )}
                              </div>
                            )}
                            {status === 'failed' && (
                              <div>
                                <Badge variant="danger">Failed</Badge>
                                {delivery?.errorMessage && (
                                  <span className="block text-[10px] text-red-400 mt-0.5 max-w-[140px] truncate" title={delivery.errorMessage}>
                                    {delivery.errorMessage}
                                  </span>
                                )}
                              </div>
                            )}
                            {status === 'generated' && <Badge variant="info">Ready</Badge>}
                            {status === 'pending' && <Badge variant="warning">Pending</Badge>}
                          </td>
                          <td className="p-3">
                            {isViewed ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                                <Eye className="w-3.5 h-3.5" />
                                Viewed {viewedAt ? new Date(viewedAt).toLocaleTimeString() : ''}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-[11px] italic">
                                Not yet viewed
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <Button
                                size="xs"
                                variant={status === 'sent' ? 'secondary' : 'primary'}
                                onClick={() => handleSendSingleRecipient(r._id || r.recipientId)}
                                loading={sendingRecipientId === (r._id || r.recipientId)}
                                icon={Send}
                                title={status === 'sent' ? 'Resend email to this user' : 'Send email to this user'}
                              >
                                {status === 'sent' ? 'Resend Mail' : 'Send Mail'}
                              </Button>
                              {cert?.certificateId && (
                                <a
                                  href={`/view-certificate/${cert.certificateId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 rounded bg-[#181b26] text-white hover:text-[#ff4d64] border border-white/10 flex items-center gap-1 text-[11px] transition-colors"
                                  title="Open Recipient Certificate View"
                                >
                                  <Eye className="w-3 h-3 text-[#ff4d64]" />
                                  <span>View Cert</span>
                                </a>
                              )}
                              {cert?.pdfUrl && (
                                <a
                                  href={cert.pdfUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded text-gray-400 hover:text-white transition-colors"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {delivery?.previewUrl && (
                                <a
                                  href={delivery.previewUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:text-white border border-blue-500/30 flex items-center gap-1 text-[11px] transition-colors"
                                  title="View Email Preview in Ethereal Sandbox"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Preview Mail</span>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <Button variant="outline" onClick={() => setCurrentStep(5)} icon={ArrowLeft}>
                  Back to Email Config
                </Button>
                <Button
                  variant="primary"
                  onClick={() => onComplete && onComplete()}
                  icon={Check}
                >
                  Finish Batch Workflow
                </Button>
              </div>
            </Card>
          );
        })()}
      </div>

      {/* Quick SMTP Configuration Modal */}
      <Modal
        isOpen={showSmtpModal}
        onClose={() => setShowSmtpModal(false)}
        title="Configure Live Nodemailer SMTP Mail Server"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <span>⚠️ Important for Gmail Users (535-5.7.8 Prevention):</span>
            </div>
            <p className="opacity-95 leading-relaxed">
              Google blocks standard email logins. You <strong>cannot use your normal Gmail account password</strong>. Instead, enable <strong>2-Step Verification</strong> and create a 16-character <strong>App Password</strong> at:
            </p>
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              className="inline-block font-mono text-[11px] bg-amber-400/20 px-2.5 py-1 rounded text-amber-100 hover:text-white underline"
            >
              https://myaccount.google.com/apppasswords &rarr;
            </a>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Quick Presets:</span>
            <button
              type="button"
              onClick={() => setSmtpModalForm(prev => ({ ...prev, host: 'smtp.gmail.com', port: 465, secure: true }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                smtpModalForm.host === 'smtp.gmail.com' && smtpModalForm.port === 465
                  ? 'bg-[#ca0019] text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Gmail SSL (465 - Recommended)
            </button>
            <button
              type="button"
              onClick={() => setSmtpModalForm(prev => ({ ...prev, host: 'smtp.gmail.com', port: 587, secure: false }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                smtpModalForm.host === 'smtp.gmail.com' && smtpModalForm.port === 587
                  ? 'bg-[#ca0019] text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Gmail TLS (587)
            </button>
            <button
              type="button"
              onClick={() => setSmtpModalForm(prev => ({ ...prev, host: 'smtp-mail.outlook.com', port: 587, secure: false }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                smtpModalForm.host === 'smtp-mail.outlook.com'
                  ? 'bg-[#ca0019] text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Outlook (587)
            </button>
          </div>

          {modalSmtpError && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 leading-relaxed break-words whitespace-pre-wrap">
              <strong className="block text-red-300 mb-1">❌ Authentication / Connection Error:</strong>
              {modalSmtpError}
            </div>
          )}

          {modalSmtpSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 leading-relaxed">
              <strong className="block text-emerald-300 mb-1">✅ Connection Verified:</strong>
              {modalSmtpSuccess}
            </div>
          )}

          <form onSubmit={handleSaveModalSmtp} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  SMTP Host <span className="text-[#ca0019]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="smtp.gmail.com"
                  value={smtpModalForm.host}
                  onChange={(e) => setSmtpModalForm({ ...smtpModalForm, host: e.target.value.trim() })}
                  className="w-full px-3 py-2 rounded-xl bg-[#181b26] border border-white/10 text-white text-xs focus:outline-none focus:border-[#ca0019]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={smtpModalForm.port}
                  onChange={(e) => {
                    const port = Number(e.target.value);
                    setSmtpModalForm({
                      ...smtpModalForm,
                      port,
                      secure: port === 465
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#181b26] border border-white/10 text-white text-xs focus:outline-none focus:border-[#ca0019]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  SMTP Username / Email <span className="text-[#ca0019]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="yourname@gmail.com"
                  value={smtpModalForm.user}
                  onChange={(e) => setSmtpModalForm({ ...smtpModalForm, user: e.target.value.trim() })}
                  className="w-full px-3 py-2 rounded-xl bg-[#181b26] border border-white/10 text-white text-xs focus:outline-none focus:border-[#ca0019]"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Must be the complete email address.</span>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Password / App Password
                </label>
                <input
                  type="password"
                  placeholder="16-character App Password"
                  value={smtpModalForm.pass}
                  onChange={(e) => setSmtpModalForm({ ...smtpModalForm, pass: e.target.value.replace(/\s+/g, '') })}
                  className="w-full px-3 py-2 rounded-xl bg-[#181b26] border border-white/10 text-white text-xs focus:outline-none focus:border-[#ca0019]"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Google App Passwords only (spaces auto-stripped).</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="modalSmtpSecure"
                checked={!!smtpModalForm.secure}
                onChange={(e) => setSmtpModalForm({ ...smtpModalForm, secure: e.target.checked })}
                className="accent-[#ca0019] rounded"
              />
              <label htmlFor="modalSmtpSecure" className="text-xs text-gray-300 cursor-pointer">
                Use SSL Direct Encryption (Required for Port 465; uncheck for Port 587 STARTTLS)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  placeholder="PRAMAAN Platform"
                  value={smtpModalForm.senderName}
                  onChange={(e) => setSmtpModalForm({ ...smtpModalForm, senderName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#181b26] border border-white/10 text-white text-xs focus:outline-none focus:border-[#ca0019]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Sender Email (From)
                </label>
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={smtpModalForm.senderEmail}
                  onChange={(e) => setSmtpModalForm({ ...smtpModalForm, senderEmail: e.target.value.trim() })}
                  className="w-full px-3 py-2 rounded-xl bg-[#181b26] border border-white/10 text-white text-xs focus:outline-none focus:border-[#ca0019]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleVerifyModalSmtp}
                  loading={verifyingModalSmtp}
                >
                  Test Connection
                </Button>
                {smtpStatus.configured && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetModalSmtp}
                    loading={savingModalSmtp}
                    title="Switch back to simulated test emails"
                  >
                    Reset to Sandbox Mode
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSmtpModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={savingModalSmtp}
                  icon={Check}
                >
                  Save & Apply Live SMTP
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
