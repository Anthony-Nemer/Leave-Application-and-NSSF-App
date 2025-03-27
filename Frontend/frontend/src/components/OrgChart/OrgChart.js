import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';

const OrgChart = ({ employees }) => {
  const containerRef = useRef(null);
  const [network, setNetwork] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({}); // Track expanded state of nodes and their children

  useEffect(() => {
    // Find top-level employees (no manager)
    const topLevelNodes = employees
      .filter(emp => !emp.manager_id)
      .map(({ id, first_name, last_name }) => ({
        id,
        label: `${first_name} ${last_name}`
      }));

    // Initialize network data
    const data = { nodes: topLevelNodes, edges: [] };
    const options = {
        nodes: {
          shape: 'circle', // Make the shape circular
          size: 30, // Adjust the size of the nodes
          font: {
            size: 14,
            color: '#fff' // Change font color for better contrast
          },
          color: {
            background: '#007bff', // Blue background color
            border: '#0062cc', // Slightly darker border
            highlight: {
              background: '#0056b3', // Highlight color on selection
              border: '#004085' // Highlighted border color
            }
          },
          borderWidth: 2, // Adjust the border width
        },
        edges: {
          arrows: {
            to: { enabled: true, scaleFactor: 1.2 } // Make arrows more prominent
          },
          color: {
            color: '#848484', // Change default color
            highlight: '#5a5a5a', // Highlight color for edges
          },
          smooth: {
            type: 'cubicBezier', // Make edges curved
            forceDirection: 'horizontal', // Force horizontal direction for better visualization
          },
          width: 2, // Adjust the edge width
        },
        layout: {
          hierarchical: {
            enabled: true,
            direction: 'UD', // Up to Down
            nodeSpacing: 150,
            levelSeparation: 150
          }
        },
        physics: { enabled: false }
      };

    // Initialize vis-network
    const newNetwork = new Network(containerRef.current, data, options);
    setNetwork(newNetwork);

    // Clean up on unmount
    return () => newNetwork.destroy();
  }, [employees]);

  useEffect(() => {
    if (network) {
      // Click event to expand/collapse node
      network.on('click', params => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          console.log(`Node clicked: ${nodeId}`);
          toggleNode(nodeId);
        }
      });
    }
  }, [network]);

  const toggleNode = (nodeId) => {
    setExpandedNodes(prevState => {
      const isExpanded = prevState.hasOwnProperty(nodeId);
      console.log(`Toggling node: ${nodeId}, currently expanded: ${isExpanded ? 'expanded' : 'not expanded'}`);
      
      if (isExpanded) {
        // Pass the most recent expandedNodes to collapseNode
        collapseNode(nodeId, prevState);
      } else {
        expandNode(nodeId);
      }
  
      // Return prevState to not modify the state inside toggleNode itself
      return prevState;
    });
  };
  
  
  const expandNode = (nodeId) => {
    console.log(`Expanding node: ${nodeId}`);
    
    // Find all subordinates of the clicked node
    const children = employees
      .filter(emp => emp.manager_id === nodeId)
      .map(({ id, first_name, last_name }) => ({
        id,
        label: `${first_name} ${last_name}`
      }));
  
    // Log the found children before proceeding
    console.log(`Found children for node ${nodeId}:`, children);
    
    if (children.length === 0) {
      console.log(`No children found for node: ${nodeId}`);
      return; // Stop if no children to expand
    }
  
    // Create edges from manager to subordinates
    const newEdges = children.map(child => ({
      from: nodeId,
      to: child.id
    }));
    
    // Check if nodes and edges are already added to avoid duplicates
    const existingNodeIds = network.body.data.nodes.getIds();
    const nodesToAdd = children.filter(child => !existingNodeIds.includes(child.id));
  
    // Add nodes and edges dynamically to the network
    network.body.data.nodes.add(nodesToAdd);
    network.body.data.edges.add(newEdges);
  
    console.log(`Added nodes: ${nodesToAdd.map(node => node.id)}`);
    console.log(`Added edges: ${newEdges.map(edge => `${edge.from}-${edge.to}`)}`);
  
    // Mark node as expanded and store its children
    setExpandedNodes(prevState => {
      // Track all children, regardless of whether they were newly added
      const allChildNodeIds = children.map(node => node.id);
      const newState = {
        ...prevState,
        [nodeId]: allChildNodeIds // Store all child IDs, not just nodesToAdd
      };
      console.log('New expandedNodes state:', newState);
      return newState;
    });
  };
  useEffect(() => {
    console.log('Current expandedNodes state:', expandedNodes);
  }, [expandedNodes]);
  

  
  const collapseNode = (nodeId, expandedNodes) => {
    console.log(`Collapsing node: ${nodeId}`);
    
    // Get all child node IDs for the node being collapsed
    const childNodeIds = expandedNodes[nodeId] || [];
    console.log(`Child nodes for node ${nodeId}:`, childNodeIds);
  
    if (childNodeIds.length === 0) {
      console.log(`No children to collapse for node: ${nodeId}`);
      return; // Stop if no children to collapse
    }
  
    console.log(`Child nodes to remove: ${childNodeIds}`);
    
    // Remove child nodes and edges from the network
    network.body.data.nodes.remove(childNodeIds);
    const edgesToRemove = network.body.data.edges.get({ filter: edge => edge.from === nodeId });
    console.log('Edges to remove:', edgesToRemove);
    network.body.data.edges.remove(edgesToRemove);
    
    console.log('Nodes and edges removed');
  
    // Correctly update expandedNodes by deleting the node's entry
    setExpandedNodes(prevState => {
      const newState = { ...prevState };
      delete newState[nodeId]; // Ensure to fully remove the entry
      console.log('Updated expandedNodes state after collapse:', newState);
      return newState;
    });
  
    console.log(`Node ${nodeId} collapsed`);
  };
  return(
    <div style={{ overflow: 'auto', height: '80vh', width: '100vw' }}>
        <div ref={containerRef} style={{ height: '100%', width: '100%' }} /> {/* Adjust width and height */}
    </div>
  );
};

export default OrgChart;