import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // Import Firestore instance
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import './ComfyUI.css';

const ComfyUI = () => {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [log, setLog] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null); // State for storing logged-in user
  const [jsonFile, setJsonFile] = useState(null); // State for holding uploaded JSON file
  const [fileName, setFileName] = useState(''); // State for the workflow name
  const serverAddress = "https://comfyui.ltbventures.com";

  // Fetch workflows from Firestore
  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'comfy_workflow'));
        const workflowList = querySnapshot.docs.map(doc => ({
          id: doc.id, // Document ID as workflow name
          data: JSON.parse(doc.data().data) // Parse the stringified JSON field into an object
        }));
        setWorkflows(workflowList);
      } catch (error) {
        console.error('Error fetching workflows:', error);
      }
    };
    fetchWorkflows();
  }, []);

  // Append logs for UI display
  const appendToLog = (message) => {
    setLog((prevLog) => [...prevLog, message]);
  };

  // Fetch results after WebSocket execution
  const fetchResults = async (promptId) => {
    const historyResponse = await fetch(`${serverAddress}/history/${promptId}`);
    const historyData = await historyResponse.json();
    const nodeOutputs = historyData[promptId]['outputs'];

    for (const [nodeId, nodeOutput] of Object.entries(nodeOutputs)) {
      if (nodeOutput.images) {
        for (const imageInfo of nodeOutput.images) {
          const imageUrl = await fetchImage(imageInfo.filename, imageInfo.subfolder, imageInfo.type);
          appendToLog(`Image URL: ${imageUrl}`);
          setImageUrls((prevUrls) => [...prevUrls, imageUrl]);
        }
      }
    }
  };

  // Fetch image results
  const fetchImage = async (filename, subfolder, type) => {
    const queryParams = new URLSearchParams({ filename, subfolder, type }).toString();
    const imageResponse = await fetch(`${serverAddress}/view?${queryParams}`);
    const imageBlob = await imageResponse.blob();
    return URL.createObjectURL(imageBlob);
  };

  // Handle submission of workflow prompt
  const submitPrompt = async () => {
    if (!selectedWorkflow) {
      alert('Please select a workflow.');
      return;
    }

    setLoading(true);
    try {
      const workflowData = workflows.find(workflow => workflow.id === selectedWorkflow);
      if (!workflowData) {
        throw new Error('Selected workflow not found');
      }

      const response = await fetch(`${serverAddress}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: workflowData.data, // Send workflow data as prompt
          client_id: generateUUID() // Generate unique client ID
        })
      });

      if (!response.ok) {
        throw new Error('Error submitting workflow');
      }

      const { prompt_id } = await response.json();
      appendToLog(`Prompt queued with ID: ${prompt_id}`);
      setupWebSocket(prompt_id);
    } catch (error) {
      console.error('Error:', error);
      appendToLog('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // WebSocket setup for real-time updates
  const setupWebSocket = (promptId) => {
    const ws = new WebSocket(`wss://${serverAddress}/ws?clientId=${generateUUID()}`);
    ws.binaryType = 'blob';

    ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        console.log('Received binary message', event.data);
      } else {
        const message = JSON.parse(event.data);
        appendToLog('Received message: ' + JSON.stringify(message));
        if (message.type === 'executing' && message.data.node === null && message.data.prompt_id === promptId) {
          appendToLog('Server has finished executing the prompt.');
          ws.close();
          fetchResults(promptId);
        }
      }
    };
  };

  // Handle JSON file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setJsonFile(JSON.parse(e.target.result));
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a valid JSON file.');
    }
  };

  // Handle writing the uploaded JSON file to Firestore
  const uploadToFirestore = async () => {
    if (!jsonFile || !fileName) {
      alert('Please upload a JSON file and enter a name.');
      return;
    }

    try {
      await setDoc(doc(db, 'comfy_workflow', fileName), {
        data: JSON.stringify(jsonFile) // Store the file contents as a string
      });
      appendToLog(`Successfully uploaded workflow: ${fileName}`);
    } catch (error) {
      console.error('Error uploading workflow:', error);
      appendToLog('Error: ' + error.message);
    }
  };

  // Helper function to generate UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  return (
    <div className="comfy-ui-container">
      <h2><span role="img" aria-label="paintbrush">🖌️</span> ComfyUI Image Generator</h2>
      <p className="welcome-message">
        👤 Welcome, {user ? user.email : 'Guest'}!
      </p>

      {/* Dropdown for selecting workflow */}
      <div className="input-container">
        <label>Select Workflow</label>
        <select
          value={selectedWorkflow}
          onChange={e => setSelectedWorkflow(e.target.value)}
        >
          <option value="">-- Choose a workflow --</option>
          {workflows.map(workflow => (
            <option key={workflow.id} value={workflow.id}>
              {workflow.id}
            </option>
          ))}
        </select>
      </div>

      {/* Submit button */}
      <button className="generate-button" onClick={submitPrompt} disabled={loading}>
        {loading ? 'Loading...' : '🎨 Generate Image'}
      </button>

      {/* Log display */}
      <div className="log">
        {log.map((entry, index) => <div key={index}>{entry}</div>)}
      </div>

      {/* Image display */}
      <div className="image-container">
        {imageUrls.map((url, index) => (
          <div key={index} className="image-item">
            <img src={url} alt={`Generated ${index}`} />
          </div>
        ))}
      </div>

      {/* File upload for JSON workflow */}
      <div className="upload-container">
        <div className="upload-section">
        <label>Upload Workflow JSON</label>
            {/* Hidden file input */}
            <input 
            type="file" 
            accept=".json" 
            onChange={handleFileUpload} 
            className="file-input" 
            id="file-upload" 
            />
            {/* Custom styled button for file input */}
            <label htmlFor="file-upload" className="custom-file-upload">
            📁 Upload JSON File
            </label>
        </div>

        <div className="workflow-name-section">
          <label>Enter Workflow Name</label>
          <input
            type="text"
            placeholder="Workflow name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="workflow-name-input"
          />
        </div>

        <button className="upload-button generate-button" onClick={uploadToFirestore}>
          Upload Workflow
        </button>
      </div>
    </div>
  );
};

export default ComfyUI;
