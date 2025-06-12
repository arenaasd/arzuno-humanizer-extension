'use client';

import React from 'react';

const Page = () => {
  return (
    <div
      style={{
        background: 'linear-gradient(to bottom right, #3B0764, #581C87)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        margin: 0, // Remove any margin that could cause scroll
      }}
    >
      <div
        style={{
          backgroundColor: '#1E0E3D',
          color: '#FFD700',
          padding: '2rem 2.5rem',
          borderRadius: '1.5rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          width: '100%',
          maxWidth: '48rem',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: '1.5rem', // Adjusted to make the title fit on one line
            fontWeight: 'bold',
            marginBottom: '1rem',
            color: '#FACC15',
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
            whiteSpace: 'nowrap', // Prevent title from breaking into new lines
            overflow: 'hidden', // Prevent any overflow
            textOverflow: 'ellipsis', // Ensures long titles get truncated with "..."
          }}
        >
          Arzuno Prompts Generator
        </h2>

        <p
          style={{
            fontSize: '1.15rem',
            color: '#FDE68A',
            lineHeight: '1.75',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '1rem',
            boxShadow: 'inset 0 0 12px rgba(255, 215, 0, 0.15)',
          }}
        >
           🔮  Select any text on a webpage and a golden floating icon will appear beside it.
          <br /><br />
           ✨ Click the icon, and the selected text will be magically enhanced using AI.
        </p>
      </div>
    </div>
  );
};

export default Page;
