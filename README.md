# nataCONNECT

nataCONNECT is a local-first family financial app and toolkit for secure shared accounts and device-proximal services.

## Run the Complete App

The complete development setup runs two local services:

- Vite frontend: `http://localhost:5173`
- Express/SQLite Pi server: `http://localhost:3001`

Install dependencies once:

```powershell
cd server
npm install
cd ../project
npm install
```

Then start both services with one command from `project`:

```powershell
npm run dev:full
```

To verify the private server directly, open:

`http://localhost:3001/family/members`

The SQLite database is created automatically at `server/nataconnect.db`. Copy `server/.env.example` to `server/.env` only when you want to configure optional external API keys. The core demo works without them.

For a Raspberry Pi deployment, copy the repository to the Pi, install the same dependencies, and set `VITE_PI_URL` to the Pi server address when building or running the frontend.

## License & Attribution

nataCONNECT is jointly developed by lordofpastitsio and CHRISPITSILLIDES and is licensed under the MIT License.

See the `LICENSE` file for the full text of the MIT License.
