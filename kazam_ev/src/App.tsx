import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import plusIcon from './assets/plus-circle 1 (1).png';
import NoteIcons from './assets/icons8-notes-app 1.png';

type Note = string; // Or whatever type your notes are

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3000', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    // Fetch initial notes
    const fetchNotes = async () => {
      try {
        const res = await fetch('http://localhost:3000/fetchAllTasks');
        if (!res.ok) throw new Error('Failed to fetch notes');
        const data: Note[] = await res.json();
        setNotes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();

    // Socket event listeners
    newSocket.on('noteAdded', (note: Note) => {
      setNotes(prev => [...prev, note]);
    });

    newSocket.on('connect_error', (err: Error) => {
      setError('Connection error: ' + err.message);
    });

    return () => {
      newSocket.off('noteAdded');
      newSocket.off('connect_error');
      newSocket.disconnect();
    };
  }, []);

  const handleAddNote = () => {
    if (newNote.trim() === '' || !socket) return;
    
    try {
      socket.emit('add', newNote);
      setNewNote('');
    } catch (err) {
      setError('Failed to add note: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <img width="36px" height="36px" src={NoteIcons} alt="Notes icon" />
          <h1 className="text-2xl font-bold">Note App</h1>
        </div>
        
        <div className="flex mb-6 gap-3">
          <input
            type="text"
            placeholder="New Note..."
            className="flex-grow px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-600"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
          />
          <button 
            onClick={handleAddNote}
            className="bg-yellow-800 text-white px-4 py-2 rounded-xl hover:bg-yellow-900 flex items-center"
            disabled={!socket || !socket.connected}
          >
            <img width="32px" height="32px" src={plusIcon} alt="Add note" />
            Add
          </button>
        </div>
        
        <h2 className="text-lg font-semibold mb-2">Notes</h2>
        <div className="h-60 overflow-y-auto pr-2 border border-gray-100 rounded notes-container">
          {notes.length === 0 ? (
            <p className="text-gray-500 py-2 text-center">No notes yet</p>
          ) : (
            notes.map((note, index) => (
              <div 
                key={index} 
                className="py-2 px-1 border-b border-gray-200 last:border-b-0"
              >
                {note}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}