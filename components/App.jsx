import React, { useState } from 'react';

// Header component - should be extracted
function Header() {
  return (
    <header className="header">
      <h1>My Awesome App</h1>
      <nav>
        <a href="#home">Home</a>
        <a href="#about">About</a>
      </nav>
    </header>
  );
}

// Sidebar component - should be extracted
const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <button onClick={() => setIsOpen(!isOpen)}>
        Toggle Sidebar
      </button>
      <ul>
        <li>Dashboard</li>
        <li>Settings</li>
        <li>Profile</li>
      </ul>
    </aside>
  );
};

// Footer component - should be extracted
function Footer() {
  return (
    <footer className="footer">
      <p>&copy; 2024 My Company. All rights reserved.</p>
      <div className="social-links">
        <a href="#twitter">Twitter</a>
        <a href="#linkedin">LinkedIn</a>
      </div>
    </footer>
  );
}

// UserCard component - should be extracted
const UserCard = ({ user }) => {
  return (
    <div className="user-card">
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <button>View Profile</button>
    </div>
  );
};

// Main App component - should NOT be extracted
function App() {
  const [users, setUsers] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', avatar: '/avatar1.jpg' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', avatar: '/avatar2.jpg' }
  ]);

  return (
    <div className="app">
      <Header />
      <div className="main-layout">
        <Sidebar />
        <main className="content">
          <h2>Welcome to the Dashboard</h2>
          <div className="users-grid">
            {users.map(user => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default App;
