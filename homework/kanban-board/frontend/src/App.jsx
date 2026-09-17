import './App.css'
import { useEffect, useState } from 'react'

function App() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      const response = await fetch('http://localhost:3000/api/tasks');
      const data = await response.json();
      setTasks(data);
    };
    fetchTasks();
  }, []);

  return (
    <>
      <h1>Kanban Board</h1>
      <pre>{JSON.stringify(tasks, null, 2)}</pre>
      <div className="kanban-board">
        <div className="column">
          <h2>TODO</h2>
        </div>

        <div className="column">
          <h2>IN PROGRESS</h2>
        </div>

        <div className="column">
          <h2>DONE</h2>
        </div>
      </div>
    </>
  )
}

export default App
