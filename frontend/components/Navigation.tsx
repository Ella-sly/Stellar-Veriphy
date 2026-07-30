"use client";

import { useEffect, useState } from "react";

interface Section {
  id: string;
  label: string;
}

const SECTIONS: Section[] = [
  { id: "hero", label: "Home" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "about", label: "About" },
];

export function Navigation() {
  const [activeSection, setActiveSection] = useState<string>("hero");

  useEffect(() => {
    const observers = new Map<string, IntersectionObserver>();

    SECTIONS.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { threshold: 0.5 }
      );

      observer.observe(element);
      observers.set(id, observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
    }
  };

  return (
    <nav className="flex gap-8">
      {SECTIONS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => handleClick(id)}
          className={`text-sm font-medium transition-colors ${
            activeSection === id
              ? "text-white border-b-2 border-blue-500"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
