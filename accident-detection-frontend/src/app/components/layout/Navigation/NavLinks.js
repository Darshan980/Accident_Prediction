import React from 'react';
import Link from 'next/link';
import { getNavItems } from '../../../utils/navigation';

const NavLinks = ({ user }) => {
  const navItems = getNavItems(user);

  return (
    <div className="nav-links" style={{ display: 'flex', gap: '0.5rem' }}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            color: '#374151',
            textDecoration: 'none',
            fontWeight: '500',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
            e.currentTarget.style.color = '#3b82f6';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#374151';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <item.icon size={18} />
          <span>{item.label}</span>
        </Link>
      ))}
    </div>
  );
};

export default NavLinks;
