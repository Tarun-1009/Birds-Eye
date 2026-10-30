export const getHealth = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Birds-Eye API is up and running',
    timestamp: new Date().toISOString(),
  });
};

