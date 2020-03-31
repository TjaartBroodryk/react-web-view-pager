import * as React from 'react';
import Pager from './pager';
import './style.css';
import { Configuration } from './configuration';

interface Props {
  pages: React.ReactElement[];
  activePage: number;
  onPageChanged?: (index: number) => void;
}

const ViewPager = ({ pages, onPageChanged, activePage, offset, timeout, duration, easing }: Props & Configuration) => {
  const container = React.useRef<HTMLDivElement>(null);
  const pager = React.useRef<Pager>(null);
  const doneScrolling = React.useRef(true);

  React.useEffect(() => {
    const element = container.current;
    pager.current = new Pager(element!, {
      offset,
      timeout,
      duration,
      easing
    }, (currentItem) => {
      if (element) {
        onPageChanged && onPageChanged(currentItem)
        doneScrolling.current = true;
      }
    });

    return () => pager.current?.unbind();
  }, [container])

  React.useEffect(() => {
    if (doneScrolling.current) {
      doneScrolling.current = false;
      pager.current?.snapTo(activePage);
    }
  }, [activePage, pager])

  return <div className="pager" ref={container}>
    {pages.map((page, index) => (
      <div className="pager-item" key={index}>
        {page}
      </div>
    ))}
  </div>
}

export default ViewPager;