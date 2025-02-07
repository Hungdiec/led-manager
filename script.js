document.addEventListener('DOMContentLoaded', () => {
  // List of valid credentials
  const validUsers = [
    { username: 'ME', password: 'Peridot@33' },
    { username: 'FB', password: 'Peridot@1968' },
    { username: 'admin', password: 'Prd@1968' }
  ];

  // Create a simple login overlay
  const loginOverlay = document.createElement('div');
  loginOverlay.id = 'loginOverlay';
  loginOverlay.style.position = 'fixed';
  loginOverlay.style.top = '0';
  loginOverlay.style.left = '0';
  loginOverlay.style.width = '100%';
  loginOverlay.style.height = '100%';
  loginOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  loginOverlay.style.display = 'flex';
  loginOverlay.style.justifyContent = 'center';
  loginOverlay.style.alignItems = 'center';
  loginOverlay.style.zIndex = '10000';

  loginOverlay.innerHTML = `
    <div style="background: #fff; padding: 20px; border-radius: 8px; text-align: center; width: 300px;">
      <h2>Login</h2>
      <div style="margin-bottom: 15px;">
        <input type="text" id="loginUsername" placeholder="Username" style="width: 100%; padding: 10px; font-size: 16px;">
      </div>
      <div style="margin-bottom: 15px;">
        <input type="password" id="loginPassword" placeholder="Password" style="width: 100%; padding: 10px; font-size: 16px;">
      </div>
      <button id="loginSubmit" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Login</button>
    </div>
  `;

  document.body.appendChild(loginOverlay);

  // Add event listener for the login button
  document.getElementById('loginSubmit').addEventListener('click', () => {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    const isAuthenticated = validUsers.some(
      (user) => user.username === username && user.password === password
    );

    if (isAuthenticated) {
      alert('Login successful!');
      loginOverlay.remove(); // Remove the login overlay
    } else {
      alert('Invalid credentials. Please try again.');
    }
  });

  const pushBtn = document.getElementById('pushBtn');
  console.log('pushBtn element:', pushBtn);

  if (pushBtn) {
    pushBtn.addEventListener('click', async () => {
      const selectedDevices = [];
      const device1 = document.getElementById('device1');
      const device2 = document.getElementById('device2');

      if (device1.checked) {
        selectedDevices.push(device1.value);
      }
      if (device2.checked) {
        selectedDevices.push(device2.value);
      }

      if (selectedDevices.length === 0) {
        alert('Please select at least one device.');
        return;
      }

      const files = document.getElementById('files').files;
      if (files.length === 0) {
        alert('Please select files to push.');
        return;
      }

      // Optional: Client-side file type and size validation
      const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/avi', 'video/quicktime'];
      const maxSize = 200 * 1024 * 1024; // 200MB

      for (let file of files) {
        if (!allowedTypes.includes(file.type)) {
          alert(`File type not allowed: ${file.name}`);
          return;
        }
        if (file.size > maxSize) {
          alert(`File size exceeds 200MB: ${file.name}`);
          return;
        }
      }

      const uploadProgressBar = document.getElementById('uploadProgressBar');
      const progressContainer = document.getElementById('progressContainer');
      const loader = document.getElementById('loader');
      progressContainer.style.display = 'block';
      loader.style.display = 'block';
      pushBtn.disabled = true;

      const formData = new FormData();
      formData.append('devices', JSON.stringify(selectedDevices));
      for (let file of files) {
        formData.append('files', file);
      }

      try {
        console.log(`[${new Date().toISOString()}] Starting file upload to server`);
        await uploadFilesWithProgress(formData, uploadProgressBar);
        console.log(`[${new Date().toISOString()}] File upload to server completed`);
        loader.style.display = 'none';
        alert('Files pushed successfully to all devices.');
      } catch (error) {
        loader.style.display = 'none';
        console.error(`[${new Date().toISOString()}] Error: ${error.message}`);
        alert(`An error occurred: ${error.message}`);
      } finally {
        pushBtn.disabled = false;
      }
    });
  } else {
    console.error('pushBtn element not found.');
  }
});

/**
 * Upload files with progress tracking.
 * @param {FormData} formData - Form data containing files and device info.
 * @param {HTMLElement} progressBar - Progress bar element to update.
 */
function uploadFilesWithProgress(formData, progressBar) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        progressBar.style.width = `${percentComplete}%`;
        progressBar.textContent = `${percentComplete}%`;
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        progressBar.style.width = '100%';
        progressBar.textContent = '100%';
        resolve();
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status} - ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to a network error.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted.'));
    });

    xhr.open('POST', 'https://srv.peridotgrand.com/push-media');
    xhr.send(formData);
  });
}
