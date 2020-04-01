import React from 'react';
import ViewPager from '../src/index';
import renderer from 'react-test-renderer';

test('View pager is mounted', () => {
  const TextComponent = () => <div/>

  const component = renderer.create(
    <ViewPager activePage={0} pages={[
      <TextComponent/>,
      <TextComponent/>,
      <TextComponent/>
    ]}/>,
  );

  const pages = component.root.findAllByType(TextComponent)
  expect(pages).toHaveLength(3);
});