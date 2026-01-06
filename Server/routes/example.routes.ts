import { Router, Request, Response } from 'express';

const router = Router();

// Example GET route
router.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Example route',
    data: [],
  });
});

// Example POST route
router.post('/', (req: Request, res: Response) => {
  const data = req.body;
  res.status(201).json({
    message: 'Resource created',
    data: data,
  });
});

// Example GET by ID route
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({
    message: `Fetching resource with ID: ${id}`,
    data: { id },
  });
});

// Example PUT route
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  res.json({
    message: `Updated resource with ID: ${id}`,
    data: { id, ...data },
  });
});

// Example DELETE route
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({
    message: `Deleted resource with ID: ${id}`,
  });
});

export default router;

