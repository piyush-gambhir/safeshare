import { ToastProvider, ToastViewport } from "./components/ui/use-toast";
import FileTransfer from "./components/FileTransfer";
import "./App.css";

function App() {
    return (
        <ToastProvider>
            <div className="min-h-screen bg-background p-4">
                <FileTransfer />
                <ToastViewport />
            </div>
        </ToastProvider>
    );
}

export default App;
