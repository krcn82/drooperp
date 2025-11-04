# Deploying Droop ERP to Firebase

This application is configured for deployment using [Firebase App Hosting](https://firebase.google.com/docs/app-hosting), which is a modern, secure, and fully-managed hosting service for web apps. It simplifies the process of deploying full-stack Next.js applications like this one.

## Prerequisites

1.  **Install Firebase CLI:** If you haven't already, install the Firebase CLI on your local machine.
    ```bash
    npm install -g firebase-tools
    ```

2.  **Log in to Firebase:** Authenticate with your Google account.
    ```bash
    firebase login
    ```

## Initial Setup

Instead of the traditional `firebase init hosting` command, you'll initialize your project for App Hosting.

1.  **Initialize App Hosting:** In your project's root directory, run the following command:
    ```bash
    firebase init apphosting
    ```

2.  **Select Project:** The CLI will prompt you to select an existing Firebase project or create a new one. This will connect your local project to your Firebase project.

3.  **Configure Backend:** It will ask you for the backend's entry point. Since this is a Next.js app, App Hosting will typically detect the correct settings.

This process will create or update the necessary Firebase configuration files (`.firebaserc`, `firebase.json`) in your project.

## Manual Deployment

### Web App Deployment

Once your project is initialized, you can deploy your Next.js application with a single command.

```bash
firebase deploy --only hosting
```

This command will:
1.  Build your Next.js application.
2.  Deploy it to Firebase App Hosting.
3.  Apply your Firestore security rules from `firestore.rules`.

The command will output the URL of your live application.

### Cloud Functions Deployment

To deploy your server-side logic located in the `functions` directory, run the following command:

```bash
firebase deploy --only functions
```

This will build and deploy all your Cloud Functions.

To deploy everything at once, simply run:
```bash
firebase deploy
```


## Automatic Deployment with GitHub Actions

You can automate deployments whenever you push code to your GitHub repository.

1.  **Create Workflow Directory:** In your project root, create the following directory structure: `.github/workflows`.

2.  **Create Workflow File:** Inside `.github/workflows`, create a file named `firebase-app-hosting.yml` and add the following content:

    ```yaml
    name: Deploy to Firebase App Hosting

    on:
      push:
        branches:
          - main # Or your default branch

    jobs:
      build_and_deploy:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout repository
            uses: actions/checkout@v4

          - name: Install Node.js
            uses: actions/setup-node@v4
            with:
              node-version: '20'

          - name: Install dependencies
            run: npm install

          - name: Build application
            run: npm run build
          
          - name: Install function dependencies
            run: cd functions && npm install && cd ..
          
          - name: Build functions
            run: cd functions && npm run build && cd ..

          - name: Deploy to Firebase
            uses: FirebaseExtended/action-hosting-deploy@v0
            with:
              repoToken: '${{ secrets.GITHUB_TOKEN }}'
              firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
              projectId: '<YOUR_FIREBASE_PROJECT_ID>'
              channelId: live
    ```

3.  **Configure GitHub Secrets:**
    *   **Replace `<YOUR_FIREBASE_PROJECT_ID>`** in the workflow file with your actual Firebase Project ID.
    *   **Create `FIREBASE_SERVICE_ACCOUNT` Secret:**
        *   Go to your Firebase Project Settings > Service accounts.
        *   Click "Generate new private key" and save the JSON file.
        *   In your GitHub repository, go to Settings > Secrets and variables > Actions.
        *   Click "New repository secret".
        *   Name the secret `FIREBASE_SERVICE_ACCOUNT`.
        *   Copy the entire content of the downloaded JSON file and paste it into the secret's value field.

  *   **Create `FIREBASE_PROJECT` Secret (recommended):**
    *   Add a repository secret named `FIREBASE_PROJECT` with your Firebase project id (e.g. `my-project-id`).
    *   The `build_and_deploy.yml` workflow uses this secret to target the correct project when running `firebase deploy`.

  Note: if you prefer the older token approach you can instead add a `FIREBASE_TOKEN` secret (value from `firebase login:ci`), but using a service account JSON is more secure and recommended for CI.

Now, every time you push to the `main` branch, your application and functions will be automatically built and deployed to Firebase App Hosting.
