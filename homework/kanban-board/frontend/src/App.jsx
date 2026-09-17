import './App.css'

function App() {

  return (
    <>
      <h1>Kanban Board</h1>
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
