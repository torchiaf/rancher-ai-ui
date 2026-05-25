export const testPod = {
  apiVersion: 'v1',
  kind:       'Pod',
  metadata:   {
    name:      'test-pod',
    namespace: 'cattle-ai-agent-system',
    labels:    {}
  },
  spec: {
    containers: [
      {
        name:  'container-0',
        image: 'nginx'
      }
    ]
  }
};