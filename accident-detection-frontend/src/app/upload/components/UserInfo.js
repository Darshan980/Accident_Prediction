// app/upload/components/UserInfo.js
import { User } from 'lucide-react'

const UserInfo = ({ user }) => {
  if (!user) return null

  return (
    <div className="user-info">
      <div className="user-info-content">
        <User className="status-icon" />
        <span className="user-info-text">
          <strong>Welcome, {user.username}!</strong> 
          {user.email && ` (${user.email})`}
          {user.role && ` - ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`}
        </span>
      </div>

      <style jsx>{`
        .user-info {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background-color: #eff6ff;
          border-radius: 0.5rem;
          border: 1px solid #bfdbfe;
        }
        
        .user-info-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .status-icon {
          width: 1.5rem;
          height: 1.5rem;
        }
        
        .user-info-text {
          color: #1e40af;
        }
      `}</style>
    </div>
  )
}

export default UserInfo
