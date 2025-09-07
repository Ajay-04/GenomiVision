

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import '../styles/dashboard.css';
import CardImage1 from '../assets/cards/1.jpg';
import CardImage2 from '../assets/cards/2.jpg';
import CardImage3 from '../assets/cards/3.jpg';
import CardImage4 from '../assets/cards/4.jpg';
import CardImage5 from '../assets/cards/5.jpg';
import CardImage6 from '../assets/cards/6.jpg';

const Dashboard = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Genomics Visualization',
      image: CardImage1,
      description: 'Create heatmaps, bar charts, and genome browsers for genomic data.',
      buttonText: 'Launch Tool',
      buttonClass: 'button-outline-primary',
      onClick: () => navigate('/visualization'),
    },
    {
      title: 'See Your History',
      image: CardImage2,
      description: 'View your uploaded files and analysis history.',
      buttonText: 'Histroy Data',
      buttonClass: 'button-outline-primary',
      onClick: () => navigate('/history'),
    },
    {
      title: 'Data Statistics',
      image: CardImage3,
      description: 'View metrics on uploaded files and variants analyzed.',
      buttonText: 'View Stats',
      buttonClass: 'button-outline-primary',
      onClick: () => alert('Data statistics coming soon!'),
    },
    {
      title: 'Analysis Reports',
      image: CardImage4,
      description: 'Access reports on variant analysis and gene expression.',
      buttonText: 'View Reports',
      buttonClass: 'button-outline-primary',
      onClick: () => alert('Analysis reports coming soon!'),
    },
    {
      title: 'Recent Activity',
      image: CardImage5,
      description: 'Track visualizations created and files uploaded.',
      buttonText: 'View All',
      buttonClass: 'button-outline-primary',
      onClick: () => alert('Recent activity coming soon!'),
    },
    {
      title: 'Project Management',
      image: CardImage6,
      description: 'Organize genomics projects and datasets efficiently.',
      buttonText: 'Manage Projects',
      buttonClass: 'button-outline-primary',
      onClick: () => alert('Project management coming soon!'),
    },
  ];

  return (
    <div id="main-wrapper">
      <Navbar />
      <div className="content-wrapper">
        {/* Heading */}
        <div className="flex-container heading-container">
          <div className="text-center">
            <h2 className="text-dark mb-3 mt-4">
              Welcome to Your <span className="fw-bold">Genomics Dashboard</span>
            </h2>
            <p className="text-dark">
              Create, analyze, and visualize genomic data with our intuitive tools.
            </p>
          </div>
        </div>

        {/* Cards */}
        <section className="spacer bg-light">
          <div className="container">
            <div className="card-container">
              {cards.map((card, index) => (
                <div className="card-item" key={index}>
                  <div className="card">
                    <div className="card-body">
                      <div className="text-center">
                        <h3 className="text-dark font-weight-medium">{card.title}</h3>
                      </div>
                      <div className="image-box text-center">
                        <img className="img-fluid" src={card.image} alt={card.title} />
                      </div>
                      <div className="text-center">
                        <button
                          className={`button ${card.buttonClass}`}
                          onClick={card.onClick}
                        >
                          {card.buttonText}
                        </button>
                      </div>
                      <p className="text-muted text-center">{card.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="footer">
          All Rights Reserved by Genomics Visualization Team.
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;