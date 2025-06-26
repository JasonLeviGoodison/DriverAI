import React, { useEffect, useRef } from "react";

interface TransparentPaneProps {
  children?: React.ReactNode;
  isSystemLocked?: boolean;
}

const TransparentPane: React.FC<TransparentPaneProps> = ({ children, isSystemLocked = false }) => {
  const clickThroughRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = async () => {
    try {
      await window.electronAPI.enableClickThrough();
    } catch (error) {
      console.error("Failed to enable click-through:", error);
    }
  };

  const handleMouseLeave = async () => {
    try {
      await window.electronAPI.disableClickThrough();
    } catch (error) {
      console.error("Failed to disable click-through:", error);
    }
  };

  useEffect(() => {
    const currentRef = clickThroughRef.current;

    if (currentRef) {
      currentRef.addEventListener("mouseenter", handleMouseEnter);
      // currentRef.addEventListener("mouseleave", handleMouseLeave);
    }

    // Cleanup function to remove event listeners
    return () => {
      if (currentRef) {
        currentRef.removeEventListener("mouseenter", handleMouseEnter);
        // currentRef.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, []);

  return (
    <div
      ref={clickThroughRef}
      className="transparent-pane"
      style={{
        background: isSystemLocked ? "rgba(0, 0, 0, 0.6)" : "transparent",
        height: "100%",
        width: "100%",
        flex: 1,
        transition: "background 0.3s ease",
      }}
    >
      {children}
    </div>
  );
};

export default TransparentPane;
