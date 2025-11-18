import React from 'react';

const WizardStep2 = ({ onSelect, onBack }) => {
  const iconMap = {
    // Basic Charts
    bar_chart: '📊',
    line_chart: '📈',
    scatter_plot: '🔵',
    heatmap: '🔥',
    
    // Genomic Specific
    genome_browser: '🧬',
    manhattan_plot: '🏔️',
    volcano_plot: '🌋',
    lollipop_plot: '🍭',
    circular_plot: '⭕',
    coverage_plot: '📏',
    
    // Expression Analysis
    box_plot: '📦',
    violin_plot: '🎻',
    pca_plot: '🎯',
    tsne_plot: '🔄',
    
    // Variant Analysis
    allele_frequency: '📊',
    phylogenetic_tree: '🌳',
    
    
    // Quality Control
    histogram: '📊',
    density_plot: '🌊',
    
    // 3D Visualizations
    scatter_3d: '🔮',
    bubble_3d: '🫧',
    surface_3d: '🏔️',
    mesh_3d: '🕸️',
    volume_3d: '📦',
    line_3d: '🌀',
    network_3d: '🕷️'
  };
  
  const categories = {
    'Basic Visualizations': [
      { id: 'bar_chart', name: 'Bar Chart', description: 'Compare categorical data' },
      { id: 'line_chart', name: 'Line Chart', description: 'Show trends and relationships' },
      { id: 'scatter_plot', name: 'Scatter Plot', description: 'Show relationships between variables' },
      { id: 'heatmap', name: 'Heatmap', description: 'Show data intensity with colors' },
      { id: 'histogram', name: 'Histogram', description: 'Show data distribution' }
    ],
    'Genomic Analysis': [
      { id: 'genome_browser', name: 'Genome Browser', description: 'Browse genomic regions with tracks' },
      { id: 'manhattan_plot', name: 'Manhattan Plot', description: 'GWAS results visualization' },
      { id: 'volcano_plot', name: 'Volcano Plot', description: 'Differential expression analysis' },
      { id: 'lollipop_plot', name: 'Lollipop Plot', description: 'Mutations along gene/protein' },
      { id: 'circular_plot', name: 'Circos Plot', description: 'Circular genome visualization' },
      { id: 'coverage_plot', name: 'Coverage Plot', description: 'Sequencing depth visualization' }
    ],
    'Expression Analysis': [
      { id: 'box_plot', name: 'Box Plot', description: 'Distribution comparison' },
      { id: 'violin_plot', name: 'Violin Plot', description: 'Enhanced distribution visualization' },
      { id: 'pca_plot', name: 'PCA Plot', description: 'Principal component analysis' },
      { id: 'tsne_plot', name: 't-SNE Plot', description: 'Dimensionality reduction clustering' }
    ],
    'Variant Analysis': [
      { id: 'allele_frequency', name: 'Allele Frequency', description: 'Variant frequency distribution' },
      { id: 'phylogenetic_tree', name: 'Phylogenetic Tree', description: 'Evolutionary relationships' }
    ],
    // Commented out temporal and geographic visualizations
    // 'Temporal & Geographic': [
    //   { id: 'time_series', name: 'Time Series', description: 'Changes over time' },
    //   { id: 'stacked_area', name: 'Stacked Area Chart', description: 'Composition over time' },
    //   { id: 'geographic_map', name: 'Geographic Map', description: 'Spatial distribution' }
    // ],
    '3D Visualizations': [
      { id: 'scatter_3d', name: '3D Scatter Plot', description: 'Three-dimensional scatter with X, Y, Z axes' },
      { id: 'bubble_3d', name: '3D Bubble Scatter', description: '3D scatter with size mapping for 4th dimension' },
      { id: 'surface_3d', name: '3D Surface Plot', description: 'Continuous surface visualization in 3D space' },
      { id: 'mesh_3d', name: '3D Mesh Plot', description: '3D hulls and surfaces around data clusters' },
      { id: 'volume_3d', name: '3D Volume Plot', description: 'Voxel-based 3D rendering for density data' },
      { id: 'line_3d', name: '3D Line/Trajectory Plot', description: 'Data evolution in 3D space' },
      { id: 'network_3d', name: '3D Network Visualization', description: 'Gene/protein networks in 3D space' }
    ]
  };

  return (
    <div className="wizard-step">
      <h3>Step 3: Choose Visualization Type</h3>
      <div className="visualization-categories">
        {Object.entries(categories).map(([categoryName, types]) => (
          <div key={categoryName} className="category-section">
            <h4 className="category-title">{categoryName}</h4>
            <div className="type-options">
              {types.map((type) => (
                <div key={type.id} className="type-option" onClick={() => onSelect(type.id)}>
                  <div className="type-icon" style={{ fontSize: '32px' }}>
                    {iconMap[type.id] || '📈'}
                  </div>
                  <div className="type-content">
                    <span className="type-name">{type.name}</span>
                    <span className="type-description">{type.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="nav-buttons">
        <button onClick={onBack}>Back</button>
      </div>
    </div>
  );
};

export default WizardStep2;
