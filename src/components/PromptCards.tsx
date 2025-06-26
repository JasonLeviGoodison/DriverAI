import React from "react";
import { Globe, FileText, Settings } from "lucide-react";

interface PromptCardsProps {
  onPromptSelect: (prompt: string) => void;
}

interface PromptCard {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: React.ReactNode;
  color: string;
}

const PromptCards: React.FC<PromptCardsProps> = ({ onPromptSelect }) => {
  const prompts: PromptCard[] = [
    {
      id: "web-search",
      title: "Web Search",
      description: "Search the web for information",
      prompt: "Search for the latest news about artificial intelligence",
      icon: <Globe size={24} />,
      color: "#3b82f6",
    },
    {
      id: "file-management",
      title: "File Management",
      description: "Organize files and folders",
      prompt: "Help me organize the files on my desktop by moving them into appropriate folders",
      icon: <FileText size={24} />,
      color: "#10b981",
    },
    {
      id: "system",
      title: "System Settings",
      description: "Adjust system preferences",
      prompt: "Help me adjust my system settings to improve battery life",
      icon: <Settings size={24} />,
      color: "#64748b",
    },
  ];

  return (
    <div className="prompt-cards-container">
      <div className="prompt-cards-header">
        <h3>Ask me to do something...</h3>
        <p>Choose a prompt to get started, or type your own message</p>
      </div>

      <div className="prompt-cards-grid">
        {prompts.map((card) => (
          <div
            key={card.id}
            className="prompt-card"
            onClick={() => onPromptSelect(card.prompt)}
            style={
              {
                borderColor: card.color,
                // Use CSS custom properties for hover and icon color
                ["--hover-color" as any]: card.color + "20",
                ["--icon-color" as any]: card.color,
              } as React.CSSProperties
            }
          >
            <div className="promptcard-icon" style={{ color: card.color }}>
              <span className="promptcard-icon-svg">{card.icon}</span>
              <h4 className="prompt-card-title">{card.title}</h4>
            </div>
            <div className="prompt-card-content">
              <p className="prompt-card-description">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .prompt-cards-container {
          padding: 2rem 1rem;
          max-width: 100%;
        }

        .prompt-cards-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .prompt-cards-header h3 {
          color: #ffffff;
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .prompt-cards-header p {
          color: #888;
          font-size: 0.9rem;
          margin: 0;
        }

        .prompt-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
          max-width: 100%;
        }

        .prompt-card {
          background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
          border: 1px solid #333;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          min-height: 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .prompt-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
          border-color: var(--icon-color);
          background: linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%);
        }

        .prompt-card:hover::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--hover-color);
          pointer-events: none;
        }

        .promptcard-icon {
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          position: relative;
          z-index: 1;
        }

        .promptcard-icon-svg {
          display: flex;
          align-items: center;
          margin-right: 0.6rem;
          font-size: 1.2rem;
        }

        .prompt-card-content {
          position: relative;
          z-index: 1;
        }

        .prompt-card-title {
          color: #ffffff;
          font-size: 1.05rem;
          font-weight: 600;
          margin: 0;
          line-height: 1.2;
        }

        .prompt-card-description {
          color: #bbb;
          font-size: 0.85rem;
          margin: 0;
          line-height: 1.3;
        }

        .prompt-card-preview {
          color: #888;
          font-size: 0.8rem;
          font-style: italic;
          margin: 0;
          line-height: 1.3;
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .prompt-cards-grid {
            grid-template-columns: 1fr;
          }

          .prompt-cards-container {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PromptCards;
